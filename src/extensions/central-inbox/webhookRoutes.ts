import type { MiddlewareConfigFn } from "wasp/server";
import { prisma } from "wasp/server";
import type {
  InboxWebhookWhatsapp,
  InboxWebhookTelegram,
  InboxWebhookMessenger,
  InboxWebhookInstagram,
  InboxWidgetMessage,
  InboxWidgetMessages,
  InboxWidgetConfig,
  InboxVerifyWhatsapp,
  InboxVerifyMessenger,
  InboxVerifyInstagram,
} from "wasp/server/api";
import { websiteAdapter } from "./channels/websiteAdapter";
import { whatsappAdapter } from "./channels/whatsappAdapter";
import { telegramAdapter } from "./channels/telegramAdapter";
import { messengerAdapter } from "./channels/messengerAdapter";
import { instagramAdapter } from "./channels/instagramAdapter";
import type { ChannelAdapter, NormalizedMessage } from "./channels/types";
import { emitNewMessage, emitNewConversation, emitConversationUpdated } from "./webSocket";
import { decrypt } from "../../social-connect/encryption";

// ---------------------------------------------------------------------------
// Middleware — skip JSON parsing (raw body needed for signature verification)
// ---------------------------------------------------------------------------

export const inboxWebhookMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  return middlewareConfig;
};

// Widget endpoints need open CORS so the embed script works on any external site
export const widgetCorsMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.set("cors", (req: any, res: any, next: any) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  return middlewareConfig;
};

// ---------------------------------------------------------------------------
// Shared message processing pipeline
// ---------------------------------------------------------------------------

async function processIncomingMessage(
  channel: string,
  normalized: NormalizedMessage,
  entities: any,
  chatbotId?: string,
): Promise<void> {
  // 1. Find a user who has an active chatbot configured for this channel
  //    For now, find the chatbot channel config matching this channel
  let chatbotChannel: any = null;
  let chatbot: any = null;
  let userId: string | null = null;

  if (chatbotId) {
    chatbot = await entities.Chatbot.findUnique({
      where: { id: chatbotId },
      include: { channels: { where: { channel, isActive: true } } },
    });
    if (chatbot) {
      chatbotChannel = chatbot.channels[0];
      userId = chatbot.userId;
    }
  }

  // If no specific chatbot, find any active chatbot for this channel
  if (!userId) {
    chatbotChannel = await prisma.chatbotChannel.findFirst({
      where: { channel, isActive: true, isConfigured: true },
      include: { chatbot: true },
    });
    if (chatbotChannel) {
      chatbot = chatbotChannel.chatbot;
      userId = chatbot?.userId;
    }
  }

  if (!userId) {
    console.log(`[Inbox] No configured chatbot found for channel ${channel}`);
    return;
  }

  // 2. Resolve sender name — for Messenger/Instagram, fetch from Graph API if missing
  let senderName = normalized.senderName;
  if (!senderName && (channel === "messenger" || channel === "instagram") && chatbotChannel?.fbAccessToken) {
    try {
      const safeDecrypt = (val: string): string => {
        try { return decrypt(val); } catch { return val; }
      };
      const pageToken = safeDecrypt(chatbotChannel.fbAccessToken);
      const profileRes = await fetch(
        `https://graph.facebook.com/${normalized.channelUserId}?fields=first_name,last_name,name,profile_pic&access_token=${pageToken}`
      );
      if (profileRes.ok) {
        const profile = await profileRes.json();
        senderName = profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || undefined;
        // Also update avatar if available
        if (profile.profile_pic) {
          normalized.metadata = { ...normalized.metadata, avatarUrl: profile.profile_pic };
        }
      }
    } catch (err) {
      console.error("[Inbox] Failed to fetch sender profile:", err);
    }
  }

  // Find or create contact
  const contact = await entities.InboxContact.upsert({
    where: {
      userId_channel_channelUserId: {
        userId,
        channel,
        channelUserId: normalized.channelUserId,
      },
    },
    create: {
      userId,
      channel,
      channelUserId: normalized.channelUserId,
      name: senderName,
      avatarUrl: normalized.metadata?.avatarUrl || undefined,
      lastSeenAt: new Date(),
    },
    update: {
      name: senderName || undefined,
      avatarUrl: normalized.metadata?.avatarUrl || undefined,
      lastSeenAt: new Date(),
    },
  });

  // 3. Find open conversation or create new one
  let conversation = await entities.InboxConversation.findFirst({
    where: {
      userId,
      contactId: contact.id,
      channel,
      status: { in: ["open", "pending"] },
    },
    orderBy: { createdAt: "desc" },
  });

  let isNew = false;
  if (!conversation) {
    isNew = true;
    conversation = await entities.InboxConversation.create({
      data: {
        userId,
        chatbotId: chatbot?.id,
        channel,
        contactId: contact.id,
        status: "open",
        handlerMode: "ai",
        lastMessageAt: new Date(),
        lastMessagePreview: normalized.content.substring(0, 100),
        unreadCount: 1,
      },
    });
  }

  // 4. Create message record
  const message = await entities.InboxMessage.create({
    data: {
      conversationId: conversation.id,
      senderType: "contact",
      senderName: senderName || normalized.senderName,
      content: normalized.content,
      contentType: normalized.contentType,
      attachments: (normalized.attachments || []) as any,
      metadata: normalized.metadata as any,
      status: "delivered",
    },
  });

  // 5. Update conversation
  await entities.InboxConversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: normalized.content.substring(0, 100),
      unreadCount: { increment: 1 },
    },
  });

  // 6. Broadcast via WebSocket
  if (isNew) {
    const fullConvo = await entities.InboxConversation.findUnique({
      where: { id: conversation.id },
      include: { contact: true },
    });
    emitNewConversation(userId, fullConvo);
  }
  emitNewMessage(userId, conversation.id, message);

  // 7. Route based on handler mode — trigger AI reply for ALL channels
  if (conversation.handlerMode === "ai") {
    try {
      const { processAiReply } = await import("./aiResponseJob");
      // Process inline (non-blocking via setTimeout to not delay webhook response)
      setTimeout(async () => {
        try {
          await processAiReply(conversation.id, entities);
        } catch (err) {
          console.error("[Inbox] AI reply processing error:", err);
        }
      }, 100);
    } catch (err) {
      console.error("[Inbox] Failed to trigger AI reply:", err);
    }
  }
  // If "human" or "queued", just broadcast — agent sees it in real-time
}

// ---------------------------------------------------------------------------
// Webhook handlers
// ---------------------------------------------------------------------------

export const whatsappWebhook: InboxWebhookWhatsapp = async (req, res, context) => {
  try {
    const normalized = whatsappAdapter.normalize(req.body);
    if (!normalized) {
      res.status(200).json({ status: "ok" }); // Always 200 for Meta webhooks
      return;
    }
    await processIncomingMessage("whatsapp", normalized, context.entities);
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("[Inbox] WhatsApp webhook error:", err);
    res.status(200).json({ status: "error" }); // Still 200 to prevent retries
  }
};

export const telegramWebhook: InboxWebhookTelegram = async (req, res, context) => {
  try {
    const normalized = telegramAdapter.normalize(req.body);
    if (!normalized) {
      res.status(200).json({ status: "ok" });
      return;
    }
    await processIncomingMessage("telegram", normalized, context.entities);
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("[Inbox] Telegram webhook error:", err);
    res.status(200).json({ status: "error" });
  }
};

export const messengerWebhook: InboxWebhookMessenger = async (req, res, context) => {
  try {
    const normalized = messengerAdapter.normalize(req.body);
    if (!normalized) {
      res.status(200).json({ status: "ok" });
      return;
    }
    await processIncomingMessage("messenger", normalized, context.entities);
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("[Inbox] Messenger webhook error:", err);
    res.status(200).json({ status: "error" });
  }
};

export const instagramWebhook: InboxWebhookInstagram = async (req, res, context) => {
  try {
    const normalized = instagramAdapter.normalize(req.body);
    if (!normalized) {
      res.status(200).json({ status: "ok" });
      return;
    }
    await processIncomingMessage("instagram", normalized, context.entities);
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("[Inbox] Instagram webhook error:", err);
    res.status(200).json({ status: "error" });
  }
};

export const widgetMessage: InboxWidgetMessage = async (req, res, context) => {
  try {
    const normalized = websiteAdapter.normalize(req.body);
    if (!normalized) {
      res.status(400).json({ error: "Invalid message format" });
      return;
    }
    const chatbotId = req.body?.chatbotId;
    await processIncomingMessage("website", normalized, context.entities, chatbotId);
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("[Inbox] Widget message error:", err);
    res.status(500).json({ error: "Internal error" });
  }
};

// ---------------------------------------------------------------------------
// Widget message polling (GET) — returns AI/agent replies for a visitor
// ---------------------------------------------------------------------------

export const widgetMessages: InboxWidgetMessages = async (req, res, context) => {
  try {
    const chatbotId = req.query.chatbotId as string;
    const visitorId = req.query.visitorId as string;
    const after = req.query.after as string | undefined;

    if (!chatbotId || !visitorId) {
      res.status(400).json({ error: "Missing chatbotId or visitorId" });
      return;
    }

    // Find the contact by visitorId
    const contact = await prisma.inboxContact.findFirst({
      where: { channelUserId: visitorId, channel: "website" },
    });

    if (!contact) {
      res.status(200).json({ messages: [] });
      return;
    }

    // Find open conversation
    const conversation = await prisma.inboxConversation.findFirst({
      where: {
        contactId: contact.id,
        channel: "website",
        status: { in: ["open", "pending"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!conversation) {
      res.status(200).json({ messages: [] });
      return;
    }

    // Get messages that are NOT from the contact (AI/agent/system replies)
    const where: any = {
      conversationId: conversation.id,
      senderType: { not: "contact" },
      isInternal: false,
    };

    // If "after" is provided, get messages created after that message
    if (after) {
      const afterMsg = await prisma.inboxMessage.findUnique({ where: { id: after } });
      if (afterMsg) {
        where.createdAt = { gt: afterMsg.createdAt };
      }
    }

    const messages = await prisma.inboxMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { id: true, content: true, senderType: true, createdAt: true },
    });

    res.status(200).json({ messages });
  } catch (err: any) {
    console.error("[Inbox] Widget messages poll error:", err);
    res.status(500).json({ error: "Internal error" });
  }
};

// ---------------------------------------------------------------------------
// Verification endpoints (GET) for Meta platforms
// ---------------------------------------------------------------------------

export const whatsappVerify: InboxVerifyWhatsapp = async (req, res, context) => {
  await handleMetaVerification(req, res, context, "whatsapp", "waVerifyToken");
};

export const messengerVerify: InboxVerifyMessenger = async (req, res, context) => {
  await handleMetaVerification(req, res, context, "messenger", "fbVerifyToken");
};

export const instagramVerify: InboxVerifyInstagram = async (req, res, context) => {
  await handleMetaVerification(req, res, context, "instagram", "fbVerifyToken");
};

async function handleMetaVerification(
  req: any,
  res: any,
  context: any,
  channel: string,
  tokenField: string,
) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token) {
    // Look up verify token from any active chatbot channel config for this channel
    const channels = await prisma.chatbotChannel.findMany({
      where: { channel, isActive: true },
    });

    for (const ch of channels) {
      const storedToken = (ch as any)[tokenField];
      if (storedToken && storedToken === token) {
        res.status(200).send(challenge);
        return;
      }
    }

    // Fallback: check Setting table (legacy)
    const settingKey = `inbox.${channel}.verify_token`;
    const setting = await context.entities.Setting.findUnique({
      where: { key: settingKey },
    });
    if (setting?.value === token) {
      res.status(200).send(challenge);
      return;
    }
  }

  res.status(403).send("Forbidden");
}

// ---------------------------------------------------------------------------
// Public chatbot config endpoint — returns appearance config for widget embed
// ---------------------------------------------------------------------------

export const widgetConfig: InboxWidgetConfig = async (req, res, context) => {
  try {
    const chatbotId = req.query.chatbotId as string;
    if (!chatbotId) {
      res.status(400).json({ error: "Missing chatbotId" });
      return;
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: {
        title: true,
        welcomeMessage: true,
        bubbleMessage: true,
        avatar: true,
        color: true,
        position: true,
        showLogo: true,
        showDateTime: true,
        embedWidth: true,
        embedHeight: true,
      },
    });

    if (!chatbot) {
      res.status(404).json({ error: "Chatbot not found" });
      return;
    }

    res.status(200).json(chatbot);
  } catch (err: any) {
    console.error("[Inbox] Widget config error:", err);
    res.status(500).json({ error: "Internal error" });
  }
};
