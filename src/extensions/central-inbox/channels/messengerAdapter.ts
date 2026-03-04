import type { ChannelAdapter, NormalizedMessage, SendMessageParams, SendResult } from "./types";

// ---------------------------------------------------------------------------
// Facebook Messenger API Adapter
// ---------------------------------------------------------------------------

export const messengerAdapter: ChannelAdapter = {
  normalize(body: any): NormalizedMessage | null {
    const entry = body?.entry?.[0];
    const messaging = entry?.messaging?.[0];
    if (!messaging?.message) return null;

    const message = messaging.message;
    const senderId = messaging.sender?.id;
    if (!senderId) return null;

    let content = "";
    let contentType: NormalizedMessage["contentType"] = "text";
    const attachments: NormalizedMessage["attachments"] = [];

    if (message.text) {
      content = message.text;
      contentType = "text";
    } else if (message.attachments) {
      const att = message.attachments[0];
      switch (att.type) {
        case "image":
          content = "[Image]";
          contentType = "image";
          attachments.push({ url: att.payload?.url || "", name: "image", type: "image/jpeg" });
          break;
        case "audio":
          content = "[Audio]";
          contentType = "audio";
          break;
        case "file":
          content = "[File]";
          contentType = "file";
          attachments.push({ url: att.payload?.url || "", name: "file", type: "application/octet-stream" });
          break;
        default:
          content = `[${att.type}]`;
      }
    }

    return {
      content,
      contentType,
      senderName: undefined, // Messenger doesn't include name in webhook — fetched separately
      channelUserId: senderId,
      attachments,
      metadata: {
        messageId: message.mid,
        pageId: entry?.id,
      },
    };
  },

  async send(params: SendMessageParams): Promise<SendResult> {
    const { channelUserId, content, credentials } = params;
    const { accessToken } = credentials;

    if (!accessToken) {
      return { success: false, error: "Messenger access token not configured" };
    }

    try {
      const url = `https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: channelUserId },
          message: { text: content },
        }),
      });

      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error?.message || "Messenger API error" };
      }

      return {
        success: true,
        externalMessageId: data.message_id,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  validateSignature(body: any, headers: Record<string, string>, secret: string): boolean {
    const signature = headers["x-hub-signature-256"];
    if (!signature || !secret) return false;

    try {
      const crypto = require("crypto");
      const rawBody = typeof body === "string" ? body : JSON.stringify(body);
      const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  },
};
