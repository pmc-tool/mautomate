import type { ChannelAdapter, NormalizedMessage, SendMessageParams, SendResult } from "./types";

// ---------------------------------------------------------------------------
// WhatsApp Cloud API Adapter
// ---------------------------------------------------------------------------

export const whatsappAdapter: ChannelAdapter = {
  normalize(body: any): NormalizedMessage | null {
    // WhatsApp Cloud API webhook payload structure
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) return null;

    const contact = value?.contacts?.[0];
    let content = "";
    let contentType: NormalizedMessage["contentType"] = "text";
    const attachments: NormalizedMessage["attachments"] = [];

    switch (message.type) {
      case "text":
        content = message.text?.body || "";
        contentType = "text";
        break;
      case "image":
        content = message.image?.caption || "[Image]";
        contentType = "image";
        if (message.image?.id) {
          attachments.push({
            url: message.image.id, // media ID — needs downloading via API
            name: "image",
            type: message.image.mime_type || "image/jpeg",
          });
        }
        break;
      case "audio":
        content = "[Audio message]";
        contentType = "audio";
        break;
      case "document":
        content = message.document?.caption || `[File: ${message.document?.filename || "document"}]`;
        contentType = "file";
        break;
      case "sticker":
        content = "[Sticker]";
        contentType = "sticker";
        break;
      default:
        content = `[Unsupported message type: ${message.type}]`;
    }

    return {
      content,
      contentType,
      senderName: contact?.profile?.name || message.from,
      channelUserId: message.from, // phone number
      attachments,
      metadata: {
        messageId: message.id,
        timestamp: message.timestamp,
        phoneNumberId: value?.metadata?.phone_number_id,
      },
    };
  },

  async send(params: SendMessageParams): Promise<SendResult> {
    const { channelUserId, content, credentials } = params;
    const { accessToken, phoneNumberId } = credentials;

    if (!accessToken || !phoneNumberId) {
      return { success: false, error: "WhatsApp credentials not configured" };
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: channelUserId,
          type: "text",
          text: { body: content },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data?.error?.message || "WhatsApp API error" };
      }

      return {
        success: true,
        externalMessageId: data?.messages?.[0]?.id,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  validateSignature(body: any, headers: Record<string, string>, secret: string): boolean {
    // WhatsApp uses X-Hub-Signature-256 header
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
