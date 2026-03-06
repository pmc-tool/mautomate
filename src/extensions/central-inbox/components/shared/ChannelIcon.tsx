import { Globe } from "lucide-react";
import { cn } from "../../../../client/utils";

import messengerIcon from "../../../../social-connect/icons/messenger.svg";
import whatsappIcon from "../../../../social-connect/icons/whatsapp.svg";
import telegramIcon from "../../../../social-connect/icons/telegram.svg";
import instagramIcon from "../../../../social-connect/icons/instagram.svg";

const CHANNEL_IMGS: Record<string, string> = {
  whatsapp: whatsappIcon,
  telegram: telegramIcon,
  messenger: messengerIcon,
  instagram: instagramIcon,
};

interface ChannelIconProps {
  channel: string;
  size?: number;
  className?: string;
}

export function ChannelIcon({ channel, size = 16, className }: ChannelIconProps) {
  const imgSrc = CHANNEL_IMGS[channel];
  if (imgSrc) {
    return <img src={imgSrc} alt={channel} width={size} height={size} className={cn("object-contain", className)} />;
  }
  // Fallback: website + unknown channels
  return <Globe size={size} className={cn("text-blue-600", className)} />;
}
