import type { ChannelAdapter, NormalizedMessage, SendMessageParams, SendResult } from "./types";

// ---------------------------------------------------------------------------
// Telegram Bot API Adapter
// ---------------------------------------------------------------------------

export const telegramAdapter: ChannelAdapter = {
  normalize(body: any): NormalizedMessage | null {
    const message = body?.message || body?.edited_message;
    if (!message) return null;

    const from = message.from;
    let content = "";
    let contentType: NormalizedMessage["contentType"] = "text";
    const attachments: NormalizedMessage["attachments"] = [];

    if (message.text) {
      content = message.text;
      contentType = "text";
    } else if (message.photo) {
      content = message.caption || "[Photo]";
      contentType = "image";
      const largest = message.photo[message.photo.length - 1];
      attachments.push({
        url: largest.file_id,
        name: "photo",
        type: "image/jpeg",
        size: largest.file_size,
      });
    } else if (message.document) {
      content = message.caption || `[File: ${message.document.file_name || "document"}]`;
      contentType = "file";
      attachments.push({
        url: message.document.file_id,
        name: message.document.file_name || "document",
        type: message.document.mime_type || "application/octet-stream",
        size: message.document.file_size,
      });
    } else if (message.voice || message.audio) {
      content = "[Audio message]";
      contentType = "audio";
    } else if (message.sticker) {
      content = message.sticker.emoji || "[Sticker]";
      contentType = "sticker";
    } else {
      content = "[Unsupported message]";
    }

    const senderName = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || from?.username || "Unknown";

    return {
      content,
      contentType,
      senderName,
      channelUserId: String(message.chat.id),
      attachments,
      metadata: {
        messageId: message.message_id,
        chatId: message.chat.id,
        username: from?.username,
      },
    };
  },

  async send(params: SendMessageParams): Promise<SendResult> {
    const { channelUserId, content, credentials } = params;
    const { botToken } = credentials;

    if (!botToken) {
      return { success: false, error: "Telegram bot token not configured" };
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelUserId,
          text: content,
          parse_mode: "HTML",
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        return { success: false, error: data?.description || "Telegram API error" };
      }

      return {
        success: true,
        externalMessageId: String(data.result?.message_id),
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
