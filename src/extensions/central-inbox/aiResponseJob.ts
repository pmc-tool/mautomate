import type { InboxAiReply } from "wasp/server/jobs";
import { prisma } from "wasp/server";
import OpenAI from "openai";
import { CreditActionType } from "../../credits/creditConfig";
import { deductCredits, refundCredits } from "../../credits/creditService";
import { HANDOFF_KEYWORDS, DEFAULT_AI_MESSAGE_LIMIT } from "./lib/inboxConstants";
import { emitNewMessage, emitConversationUpdated, emitHandoffRequest } from "./webSocket";
import { whatsappAdapter } from "./channels/whatsappAdapter";
import { telegramAdapter } from "./channels/telegramAdapter";
import { messengerAdapter } from "./channels/messengerAdapter";
import { instagramAdapter } from "./channels/instagramAdapter";
import type { ChannelAdapter, ChannelCredentials } from "./channels/types";
import { decrypt } from "../../social-connect/encryption";
import { getSecureSetting } from "../../server/settingEncryption";

// ---------------------------------------------------------------------------
// PgBoss job handler
// ---------------------------------------------------------------------------

export const inboxAiReplyJob: InboxAiReply<
  { conversationId: string },
  void
> = async (args, context) => {
  const { conversationId } = args;
  await processAiReply(conversationId, context.entities);
};

// ---------------------------------------------------------------------------
// Core AI reply processor (also called inline from webhookRoutes)
// ---------------------------------------------------------------------------

export async function processAiReply(
  conversationId: string,
  entities: any,
): Promise<void> {
  // 1. Load conversation
  const conversation = await entities.InboxConversation.findUnique({
    where: { id: conversationId },
    include: { contact: true },
  });

  if (!conversation) return;
  if (conversation.handlerMode !== "ai") return; // not AI mode anymore

  // 2. Load recent messages for context window
  const recentMessages = await entities.InboxMessage.findMany({
    where: { conversationId, isInternal: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const messages = recentMessages.reverse();

  // 3. Get the latest customer message
  const lastCustomerMsg = messages.filter((m: any) => m.senderType === "contact").pop();
  if (!lastCustomerMsg) return;

  // Check if already replied to this message
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.senderType === "ai") return; // already replied

  // 4. Check for handoff triggers in the customer message
  const shouldHandoff = checkHandoffTriggers(lastCustomerMsg.content, messages);
  if (shouldHandoff.trigger) {
    await handleHandoff(conversation, shouldHandoff.reason, entities);
    return;
  }

  // 5. Load chatbot config + training data
  let chatbot: any = null;
  let trainedData: any[] = [];

  if (conversation.chatbotId) {
    chatbot = await entities.Chatbot.findUnique({
      where: { id: conversation.chatbotId },
    });
    if (chatbot) {
      trainedData = await entities.ChatbotData.findMany({
        where: { chatbotId: chatbot.id, status: "trained" },
      });
    }
  }

  // 6. Load OpenAI API key (decrypts if encrypted)
  const openaiApiKey = await getSecureSetting(entities.Setting, "platform.openai_api_key");
  if (!openaiApiKey) {
    console.error("[Inbox AI] No OpenAI API key configured");
    return;
  }

  // 7. Build system prompt
  let systemPrompt = buildSystemPrompt(chatbot, trainedData, conversation);

  // 8. Build messages array
  const openaiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.senderType === "contact") {
      openaiMessages.push({ role: "user", content: msg.content });
    } else if (msg.senderType === "ai") {
      openaiMessages.push({ role: "assistant", content: msg.content });
    }
    // system messages are not included in AI context
  }

  // 9. Deduct credits
  try {
    await deductCredits(
      prisma,
      conversation.userId,
      CreditActionType.InboxAiReply,
      { conversationId, channel: conversation.channel }
    );
  } catch (err: any) {
    // Insufficient credits — hand off to human
    await handleHandoff(conversation, "Insufficient credits for AI reply", entities);
    return;
  }

  // 10. Call OpenAI
  const openai = new OpenAI({ apiKey: openaiApiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "I'm sorry, I couldn't generate a response. Let me connect you to a human agent.";

    // 11. Check if AI response suggests handoff
    if (reply.toLowerCase().includes("connect you to") || reply.toLowerCase().includes("transfer you to")) {
      await handleHandoff(conversation, "AI suggested human handoff", entities);
      // Still send the message so customer sees the transition
    }

    // 12. Save AI message
    const aiMessage = await entities.InboxMessage.create({
      data: {
        conversationId,
        senderType: "ai",
        senderName: chatbot?.title || "AI Assistant",
        content: reply,
        contentType: "text",
        status: "sent",
      },
    });

    // 13. Update conversation
    await entities.InboxConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: reply.substring(0, 100),
      },
    });

    // 14. Broadcast via WebSocket
    emitNewMessage(conversation.userId, conversationId, aiMessage);

    // 15. Send response via channel adapter to customer
    await sendViaChannel(conversation.channel, conversation, reply, entities);

  } catch (err: any) {
    console.error("[Inbox AI] OpenAI error:", err);
    // Refund credits on failure
    try {
      await refundCredits(
        prisma,
        conversation.userId,
        CreditActionType.InboxAiReply,
        "AI response failed"
      );
    } catch (refundErr) {
      console.error("[Inbox AI] Credit refund failed:", refundErr);
    }
  }
}

// ---------------------------------------------------------------------------
// Handoff triggers
// ---------------------------------------------------------------------------

function checkHandoffTriggers(
  content: string,
  messages: any[],
): { trigger: boolean; reason: string } {
  const lowerContent = content.toLowerCase();

  // Keyword detection
  for (const keyword of HANDOFF_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      return { trigger: true, reason: `Customer requested: "${keyword}"` };
    }
  }

  // Message count threshold
  const aiMessageCount = messages.filter((m: any) => m.senderType === "ai").length;
  if (aiMessageCount >= DEFAULT_AI_MESSAGE_LIMIT) {
    return { trigger: true, reason: `AI message limit reached (${DEFAULT_AI_MESSAGE_LIMIT} messages)` };
  }

  return { trigger: false, reason: "" };
}

// ---------------------------------------------------------------------------
// Handle handoff to human
// ---------------------------------------------------------------------------

async function handleHandoff(
  conversation: any,
  reason: string,
  entities: any,
): Promise<void> {
  // Set to queued mode
  await entities.InboxConversation.update({
    where: { id: conversation.id },
    data: {
      handlerMode: "queued",
      handoffReason: reason,
    },
  });

  // Add system message
  const systemMsg = await entities.InboxMessage.create({
    data: {
      conversationId: conversation.id,
      senderType: "system",
      content: "Connecting you to an agent. Please hold on...",
      contentType: "text",
      status: "sent",
    },
  });

  // Broadcast
  emitNewMessage(conversation.userId, conversation.id, systemMsg);
  emitConversationUpdated(conversation.userId, conversation.id, {
    handlerMode: "queued",
    handoffReason: reason,
  });
  emitHandoffRequest(conversation.userId, conversation.id, reason);

  // Send the "connecting" message to customer via channel
  await sendViaChannel(
    conversation.channel,
    conversation,
    "Connecting you to an agent. Please hold on...",
    entities,
  );
}

// ---------------------------------------------------------------------------
// Build system prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(chatbot: any, trainedData: any[], conversation: any): string {
  let prompt = "";

  if (chatbot) {
    prompt = `You are a helpful assistant named "${chatbot.title}".\n`;
    if (chatbot.instructions) prompt += `${chatbot.instructions}\n`;
    if (chatbot.dontGoBeyond) {
      prompt += "Only answer questions based on the context below. If asked about unrelated topics, politely decline.\n";
    }
    if (chatbot.language) prompt += `Always respond in ${chatbot.language}.\n`;
  } else {
    prompt = "You are a helpful customer support assistant.\n";
  }

  prompt += "\nIMPORTANT RULES:\n";
  prompt += "- Be concise and helpful.\n";
  prompt += "- If the customer asks for a human agent, acknowledge their request.\n";
  prompt += "- If you cannot help with something (billing, complaints, technical issues beyond your scope), say you'll connect them to a human agent.\n";
  prompt += `- The customer is contacting via ${conversation.channel}.\n`;

  if (conversation.contact?.name) {
    prompt += `- Customer name: ${conversation.contact.name}\n`;
  }

  if (trainedData.length > 0) {
    prompt += "\n### Knowledge Base:\n";
    for (const item of trainedData) {
      const label = item.typeValue ? `[${item.type}: ${item.typeValue}]` : `[${item.type}]`;
      prompt += `${label} ${item.content ?? ""}\n`;
    }
  }

  return prompt;
}

// ---------------------------------------------------------------------------
// Send response via channel adapter
// ---------------------------------------------------------------------------

// Exported for agent message sending from operations.ts
export const sendAgentMessage = sendViaChannel;

async function sendViaChannel(
  channel: string,
  conversation: any,
  content: string,
  entities: any,
): Promise<void> {
  if (channel === "website") return; // Website uses WebSocket, no outbound API

  // Get channel credentials from ChatbotChannel and decrypt encrypted fields
  let credentials: ChannelCredentials = {};
  let chatbotChannel: any = null;

  if (conversation.chatbotId) {
    chatbotChannel = await prisma.chatbotChannel.findFirst({
      where: { chatbotId: conversation.chatbotId, channel },
    });
  }

  // Fallback: if no chatbotId on conversation, find any active channel config
  if (!chatbotChannel) {
    chatbotChannel = await prisma.chatbotChannel.findFirst({
      where: { channel, isActive: true, isConfigured: true },
    });
  }

  if (chatbotChannel) {
    const safeDecrypt = (val: string | null | undefined): string | undefined => {
      if (!val) return undefined;
      try {
        return decrypt(val);
      } catch {
        // If decryption fails, value might be stored unencrypted
        return val;
      }
    };

    credentials = {
      accessToken: safeDecrypt(chatbotChannel.waAccessToken) || safeDecrypt(chatbotChannel.fbAccessToken) || undefined,
      botToken: safeDecrypt(chatbotChannel.tgBotToken) || undefined,
      phoneNumberId: chatbotChannel.waPhoneNumberId || undefined,
      appSecret: safeDecrypt(chatbotChannel.fbAppSecret) || undefined,
    };
  }

  const channelUserId = conversation.contact?.channelUserId;
  if (!channelUserId) return;

  const adapters: Record<string, ChannelAdapter> = {
    whatsapp: whatsappAdapter,
    telegram: telegramAdapter,
    messenger: messengerAdapter,
    instagram: instagramAdapter,
  };

  const adapter = adapters[channel];
  if (!adapter) return;

  try {
    const result = await adapter.send({
      channelUserId,
      content,
      credentials,
    });
    if (!result.success) {
      console.error(`[Inbox] Failed to send via ${channel}:`, result.error);
    }
  } catch (err) {
    console.error(`[Inbox] Channel send error (${channel}):`, err);
  }
}
