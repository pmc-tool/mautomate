// ---------------------------------------------------------------------------
// Channel-specific message formatting
// ---------------------------------------------------------------------------

/**
 * Format message content for a specific channel's API requirements.
 * Each platform has different constraints (length, formatting, etc.)
 */
export function formatForChannel(content: string, channel: string): string {
  switch (channel) {
    case "whatsapp":
      // WhatsApp supports basic formatting: *bold*, _italic_, ~strikethrough~, ```code```
      return content;

    case "telegram":
      // Telegram uses HTML tags: <b>bold</b>, <i>italic</i>, <code>code</code>
      return content
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<i>$1</i>");

    case "messenger":
    case "instagram":
      // Messenger and Instagram: plain text only
      return stripFormatting(content);

    case "website":
    default:
      return content;
  }
}

/**
 * Strip all markdown/formatting from content
 */
function stripFormatting(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/~(.*?)~/g, "$1")
    .replace(/```(.*?)```/g, "$1")
    .replace(/`(.*?)`/g, "$1");
}

/**
 * Truncate a message preview for display in the conversation list
 */
export function truncatePreview(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trimEnd() + "...";
}

/**
 * Format a date for display in the chat
 */
export function formatMessageTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatMessageDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const dayMs = 86400000;

  if (diff < dayMs) return "Today";
  if (diff < dayMs * 2) return "Yesterday";
  if (diff < dayMs * 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
