import { HttpError } from "wasp/server";
import type {
  GetConversations,
  GetConversation,
  GetConversationMessages,
  GetInboxStats,
  GetInboxAgents,
  GetInboxChannels,
  SendInboxMessage,
  TakeOverConversation,
  ReturnToAi,
  AssignConversation,
  UpdateConversationStatus,
  ToggleConversationStar,
  AddInboxNote,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";

// ---------------------------------------------------------------------------
// Extension guard
// ---------------------------------------------------------------------------

const EXTENSION_ID = "central-inbox";

async function ensureExtensionActive(
  userExtensionEntity: any,
  userId: string
): Promise<void> {
  const record = await userExtensionEntity.findUnique({
    where: { userId_extensionId: { userId, extensionId: EXTENSION_ID } },
  });
  if (!record?.isActive) {
    throw new HttpError(
      403,
      "Central Inbox extension is not activated. Enable it in the Marketplace."
    );
  }
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const getConversationsSchema = z.object({
  channel: z.string().optional(),
  status: z.string().optional(),
  assignedTo: z.string().optional().nullable(),
  isStarred: z.boolean().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const getConversationSchema = z.object({
  id: z.string().uuid(),
});

const getConversationMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const sendInboxMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  contentType: z.string().optional(),
  attachments: z.array(z.any()).optional(),
});

const takeOverSchema = z.object({
  conversationId: z.string().uuid(),
});

const returnToAiSchema = z.object({
  conversationId: z.string().uuid(),
});

const assignConversationSchema = z.object({
  conversationId: z.string().uuid(),
  assignedTo: z.string().uuid().nullable(),
});

const updateStatusSchema = z.object({
  conversationId: z.string().uuid(),
  status: z.enum(["open", "pending", "resolved", "closed"]),
});

const toggleStarSchema = z.object({
  conversationId: z.string().uuid(),
});

const addNoteSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getConversations: GetConversations<
  z.infer<typeof getConversationsSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(getConversationsSchema, rawArgs);

  const where: any = { userId: context.user.id };

  if (args.channel) where.channel = args.channel;
  if (args.status) where.status = args.status;
  if (args.isStarred !== undefined) where.isStarred = args.isStarred;

  // assignedTo filter: null = unassigned, "me" = mine, uuid = specific
  if (args.assignedTo === null) {
    where.assignedTo = null;
  } else if (args.assignedTo === "me") {
    where.assignedTo = context.user.id;
  } else if (args.assignedTo) {
    where.assignedTo = args.assignedTo;
  }

  if (args.search) {
    where.OR = [
      { subject: { contains: args.search, mode: "insensitive" } },
      { lastMessagePreview: { contains: args.search, mode: "insensitive" } },
      { contact: { name: { contains: args.search, mode: "insensitive" } } },
      { contact: { email: { contains: args.search, mode: "insensitive" } } },
    ];
  }

  const conversations = await context.entities.InboxConversation.findMany({
    where,
    include: {
      contact: true,
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    take: args.limit || 50,
    ...(args.cursor ? { skip: 1, cursor: { id: args.cursor } } : {}),
  });

  const limit = args.limit || 50;
  return {
    conversations,
    nextCursor: conversations.length === limit ? conversations[conversations.length - 1]?.id : null,
  };
};

export const getConversation: GetConversation<
  z.infer<typeof getConversationSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(getConversationSchema, rawArgs);

  const conversation = await context.entities.InboxConversation.findUnique({
    where: { id: args.id },
    include: {
      contact: true,
      notes: {
        orderBy: { createdAt: "desc" },
      },
      messages: {
        take: 50,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!conversation) throw new HttpError(404, "Conversation not found");
  if (conversation.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  return {
    ...conversation,
    messages: conversation.messages.reverse(), // chronological order
  };
};

export const getConversationMessages: GetConversationMessages<
  z.infer<typeof getConversationMessagesSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(getConversationMessagesSchema, rawArgs);

  // Verify ownership
  const convo = await context.entities.InboxConversation.findUnique({
    where: { id: args.conversationId },
    select: { userId: true },
  });
  if (!convo) throw new HttpError(404, "Conversation not found");
  if (convo.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  const messages = await context.entities.InboxMessage.findMany({
    where: { conversationId: args.conversationId },
    orderBy: { createdAt: "desc" },
    take: args.limit || 50,
    ...(args.cursor ? { skip: 1, cursor: { id: args.cursor } } : {}),
  });

  const limit = args.limit || 50;
  return {
    messages: messages.reverse(),
    nextCursor: messages.length === limit ? messages[0]?.id : null, // oldest msg for "load more"
  };
};

export const getInboxStats: GetInboxStats<void, any> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const userId = context.user.id;

  const [total, open, mine, unassigned, starred] = await Promise.all([
    context.entities.InboxConversation.count({ where: { userId, status: { in: ["open", "pending"] } } }),
    context.entities.InboxConversation.count({ where: { userId, status: "open" } }),
    context.entities.InboxConversation.count({ where: { userId, assignedTo: userId, status: { in: ["open", "pending"] } } }),
    context.entities.InboxConversation.count({ where: { userId, assignedTo: null, status: { in: ["open", "pending"] } } }),
    context.entities.InboxConversation.count({ where: { userId, isStarred: true } }),
  ]);

  // Per-channel counts
  const channels = ["website", "whatsapp", "telegram", "messenger", "instagram"];
  const channelCounts: Record<string, number> = {};
  await Promise.all(
    channels.map(async (ch) => {
      channelCounts[ch] = await context.entities.InboxConversation.count({
        where: { userId, channel: ch, status: { in: ["open", "pending"] } },
      });
    })
  );

  return { total, open, mine, unassigned, starred, channels: channelCounts };
};

export const getInboxAgents: GetInboxAgents<void, any> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");

  // Return all users who could be agents (same org — for now, just the current user)
  // In a multi-team setup, you'd filter by team/org
  const agents = await context.entities.User.findMany({
    where: { id: context.user.id },
    select: { id: true, fullName: true, email: true, avatarUrl: true },
  });

  return agents;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const sendInboxMessage: SendInboxMessage<
  z.infer<typeof sendInboxMessageSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(sendInboxMessageSchema, rawArgs);

  // Verify ownership and handler mode
  const convo = await context.entities.InboxConversation.findUnique({
    where: { id: args.conversationId },
  });
  if (!convo) throw new HttpError(404, "Conversation not found");
  if (convo.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  if (convo.handlerMode !== "human") {
    throw new HttpError(400, "Cannot send message — conversation is not in human mode. Take over first.");
  }
  if (convo.assignedTo !== context.user.id) {
    throw new HttpError(400, "Cannot send message — conversation is assigned to another agent.");
  }

  // Create the message
  const message = await context.entities.InboxMessage.create({
    data: {
      conversationId: args.conversationId,
      senderType: "agent",
      senderId: context.user.id,
      senderName: context.user.fullName || context.user.email || "Agent",
      content: args.content,
      contentType: args.contentType || "text",
      attachments: (args.attachments || []) as any,
      status: "sent",
    },
  });

  // Update conversation last message
  await context.entities.InboxConversation.update({
    where: { id: args.conversationId },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: args.content.substring(0, 100),
      unreadCount: 0, // agent is reading it
    },
  });

  // Send message to customer via channel adapter (Telegram, WhatsApp, etc.)
  if (convo.channel !== "website") {
    try {
      const { sendAgentMessage } = await import("./aiResponseJob");
      const fullConvo = await context.entities.InboxConversation.findUnique({
        where: { id: args.conversationId },
        include: { contact: true },
      });
      if (fullConvo) {
        await sendAgentMessage(fullConvo.channel, fullConvo, args.content, context.entities);
      }
    } catch (err: any) {
      console.error("[Inbox] Failed to send agent message via channel:", err);
    }
  }

  return message;
};

export const takeOverConversation: TakeOverConversation<
  z.infer<typeof takeOverSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(takeOverSchema, rawArgs);

  // Optimistic locking: only transition from ai or queued
  const result = await context.entities.InboxConversation.updateMany({
    where: {
      id: args.conversationId,
      userId: context.user.id,
      handlerMode: { in: ["ai", "queued"] },
    },
    data: {
      handlerMode: "human",
      assignedTo: context.user.id,
    },
  });

  if (result.count === 0) {
    throw new HttpError(409, "Could not take over — conversation may already be assigned to another agent.");
  }

  // Add system message
  await context.entities.InboxMessage.create({
    data: {
      conversationId: args.conversationId,
      senderType: "system",
      content: `${context.user.fullName || "An agent"} took over this conversation.`,
      contentType: "text",
      status: "sent",
    },
  });

  return { success: true };
};

export const returnToAi: ReturnToAi<
  z.infer<typeof returnToAiSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(returnToAiSchema, rawArgs);

  const result = await context.entities.InboxConversation.updateMany({
    where: {
      id: args.conversationId,
      userId: context.user.id,
      handlerMode: "human",
      assignedTo: context.user.id,
    },
    data: {
      handlerMode: "ai",
      assignedTo: null,
      handoffReason: null,
    },
  });

  if (result.count === 0) {
    throw new HttpError(409, "Could not return to AI — you may not be the assigned agent.");
  }

  await context.entities.InboxMessage.create({
    data: {
      conversationId: args.conversationId,
      senderType: "system",
      content: "Conversation returned to AI assistant.",
      contentType: "text",
      status: "sent",
    },
  });

  return { success: true };
};

export const assignConversation: AssignConversation<
  z.infer<typeof assignConversationSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(assignConversationSchema, rawArgs);

  const convo = await context.entities.InboxConversation.findUnique({
    where: { id: args.conversationId },
  });
  if (!convo) throw new HttpError(404, "Conversation not found");
  if (convo.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  await context.entities.InboxConversation.update({
    where: { id: args.conversationId },
    data: {
      assignedTo: args.assignedTo,
      handlerMode: args.assignedTo ? "human" : "ai",
    },
  });

  const assigneeName = args.assignedTo
    ? (await context.entities.InboxConversation.findUnique({ where: { id: args.conversationId } }))?.assignedTo
    : "AI";

  await context.entities.InboxMessage.create({
    data: {
      conversationId: args.conversationId,
      senderType: "system",
      content: args.assignedTo
        ? `Conversation assigned to an agent.`
        : `Conversation unassigned and returned to AI.`,
      contentType: "text",
      status: "sent",
    },
  });

  return { success: true };
};

export const updateConversationStatus: UpdateConversationStatus<
  z.infer<typeof updateStatusSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(updateStatusSchema, rawArgs);

  const convo = await context.entities.InboxConversation.findUnique({
    where: { id: args.conversationId },
  });
  if (!convo) throw new HttpError(404, "Conversation not found");
  if (convo.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  await context.entities.InboxConversation.update({
    where: { id: args.conversationId },
    data: { status: args.status },
  });

  await context.entities.InboxMessage.create({
    data: {
      conversationId: args.conversationId,
      senderType: "system",
      content: `Status changed to ${args.status}.`,
      contentType: "text",
      status: "sent",
    },
  });

  return { success: true };
};

export const toggleConversationStar: ToggleConversationStar<
  z.infer<typeof toggleStarSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(toggleStarSchema, rawArgs);

  const convo = await context.entities.InboxConversation.findUnique({
    where: { id: args.conversationId },
    select: { userId: true, isStarred: true },
  });
  if (!convo) throw new HttpError(404, "Conversation not found");
  if (convo.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  await context.entities.InboxConversation.update({
    where: { id: args.conversationId },
    data: { isStarred: !convo.isStarred },
  });

  return { isStarred: !convo.isStarred };
};

export const addInboxNote: AddInboxNote<
  z.infer<typeof addNoteSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(addNoteSchema, rawArgs);

  // Verify ownership
  const convo = await context.entities.InboxConversation.findUnique({
    where: { id: args.conversationId },
    select: { userId: true },
  });
  if (!convo) throw new HttpError(404, "Conversation not found");
  if (convo.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  const note = await context.entities.InboxNote.create({
    data: {
      conversationId: args.conversationId,
      authorId: context.user.id,
      content: args.content,
    },
  });

  return note;
};

// ---------------------------------------------------------------------------
// Get Inbox Channels — returns chatbot channels with masked credentials
// ---------------------------------------------------------------------------

export const getInboxChannels: GetInboxChannels<void, any> = async (
  _args,
  context
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");

  const chatbots = await context.entities.Chatbot.findMany({
    where: { userId: context.user.id },
    include: { channels: true },
    orderBy: { createdAt: "desc" },
  });

  if (chatbots.length === 0) return { chatbots: [], channels: [] };

  // Flatten all channels across chatbots, returning masked credentials
  const channels = chatbots.flatMap((chatbot: any) =>
    chatbot.channels.map((ch: any) => ({
      id: ch.id,
      chatbotId: ch.chatbotId,
      chatbotName: chatbot.title,
      channel: ch.channel,
      isActive: ch.isActive,
      isConfigured: ch.isConfigured,
      // Non-secret fields — return as-is
      fbAppId: ch.fbAppId || "",
      fbPageName: ch.fbPageName || "",
      fbVerifyToken: ch.fbVerifyToken || "",
      waPhoneNumberId: ch.waPhoneNumberId || "",
      waBusinessId: ch.waBusinessId || "",
      waVerifyToken: ch.waVerifyToken || "",
      tgBotUsername: ch.tgBotUsername || "",
      embedWidth: ch.embedWidth,
      embedHeight: ch.embedHeight,
      // Secret fields — only boolean indicating if set
      hasFbAppSecret: !!ch.fbAppSecret,
      hasFbAccessToken: !!ch.fbAccessToken,
      hasWaAccessToken: !!ch.waAccessToken,
      hasTgBotToken: !!ch.tgBotToken,
    }))
  );

  return {
    chatbots: chatbots.map((c: any) => ({ id: c.id, name: c.name })),
    channels,
  };
};
