import type { ChannelAdapter, NormalizedMessage, SendMessageParams, SendResult } from "./types";
import { emitNewMessage } from "../webSocket";

// ---------------------------------------------------------------------------
// Website Widget Adapter
// ---------------------------------------------------------------------------
// The website widget communicates via WebSocket directly — no external API.
// "Sending" a message means broadcasting via Socket.IO to the widget client.
// ---------------------------------------------------------------------------

export const websiteAdapter: ChannelAdapter = {
  normalize(body: any): NormalizedMessage | null {
    const channelUserId = body?.channelUserId || body?.visitorId;
    if (!body?.content || !channelUserId) return null;

    return {
      content: body.content,
      contentType: body.contentType || "text",
      senderName: body.senderName || "Visitor",
      channelUserId,
      attachments: body.attachments || [],
      metadata: body.metadata,
    };
  },

  async send(params: SendMessageParams): Promise<SendResult> {
    // For website channel, we broadcast via WebSocket instead of calling an API.
    // The message is already persisted; we just need the widget client to receive it.
    // The actual emit happens in the calling code (webhookRoutes / aiResponseJob).
    return { success: true };
  },
};
