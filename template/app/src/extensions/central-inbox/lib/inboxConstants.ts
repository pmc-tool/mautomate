// ---------------------------------------------------------------------------
// Inbox constants and enums
// ---------------------------------------------------------------------------

export const CHANNELS = ["website", "whatsapp", "telegram", "messenger", "instagram"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CONVERSATION_STATUSES = ["open", "pending", "resolved", "closed"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const HANDLER_MODES = ["ai", "human", "queued"] as const;
export type HandlerMode = (typeof HANDLER_MODES)[number];

export const SENDER_TYPES = ["contact", "ai", "agent", "system"] as const;
export type SenderType = (typeof SENDER_TYPES)[number];

export const CONTENT_TYPES = ["text", "image", "file", "audio", "sticker"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const MESSAGE_STATUSES = ["sending", "sent", "delivered", "read", "failed"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

// Handoff trigger keywords
export const HANDOFF_KEYWORDS = [
  "speak to human",
  "talk to human",
  "human agent",
  "real person",
  "talk to agent",
  "speak to agent",
  "live agent",
  "customer service",
  "operator",
  "representative",
  "transfer",
];

// Default AI message limit before auto-handoff
export const DEFAULT_AI_MESSAGE_LIMIT = 10;

// Default confidence threshold for handoff
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.3;
