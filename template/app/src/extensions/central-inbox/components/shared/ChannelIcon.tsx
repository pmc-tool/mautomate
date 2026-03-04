import {
  Globe,
  MessageCircle,
  MessageSquare,
  Send,
  Instagram,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../../../client/utils";

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  website: Globe,
  whatsapp: MessageCircle,
  telegram: Send,
  messenger: MessageSquare,
  instagram: Instagram,
};

const CHANNEL_COLORS: Record<string, string> = {
  website: "text-blue-600",
  whatsapp: "text-green-600",
  telegram: "text-sky-600",
  messenger: "text-purple-600",
  instagram: "text-pink-600",
};

interface ChannelIconProps {
  channel: string;
  size?: number;
  className?: string;
}

export function ChannelIcon({ channel, size = 16, className }: ChannelIconProps) {
  const Icon = CHANNEL_ICONS[channel] || Globe;
  const color = CHANNEL_COLORS[channel] || "";

  return <Icon size={size} className={cn(color, className)} />;
}
