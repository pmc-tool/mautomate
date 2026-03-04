// ---------------------------------------------------------------------------
// Channel metadata — icons, colors, labels
// ---------------------------------------------------------------------------

export interface ChannelMeta {
  id: string;
  label: string;
  icon: string;       // lucide-react icon name
  color: string;      // tailwind color class
  bgColor: string;    // tailwind bg class
}

export const CHANNEL_CONFIG: Record<string, ChannelMeta> = {
  website: {
    id: "website",
    label: "Website",
    icon: "Globe",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "MessageCircle",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  telegram: {
    id: "telegram",
    label: "Telegram",
    icon: "Send",
    color: "text-sky-600",
    bgColor: "bg-sky-100",
  },
  messenger: {
    id: "messenger",
    label: "Messenger",
    icon: "MessageSquare",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    icon: "Instagram",
    color: "text-pink-600",
    bgColor: "bg-pink-100",
  },
};

export function getChannelConfig(channel: string): ChannelMeta {
  return CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.website;
}
