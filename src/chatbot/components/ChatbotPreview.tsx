import { useState } from "react";
import { cn } from "../../client/utils";
import { Globe } from "lucide-react";
import WebsitePreview from "./previews/WebsitePreview";
import MessengerPreview from "./previews/MessengerPreview";
import WhatsAppPreview from "./previews/WhatsAppPreview";
import TelegramPreview from "./previews/TelegramPreview";

import messengerIcon from "../../social-connect/icons/messenger.svg";
import whatsappIcon from "../../social-connect/icons/whatsapp.svg";
import telegramIcon from "../../social-connect/icons/telegram.svg";

interface ChatbotPreviewProps {
  draft: Record<string, any>;
  channels?: string[];
  chatbotId?: string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon?: string }> = {
  website: { label: "Website" },
  messenger: { label: "Messenger", icon: messengerIcon },
  whatsapp: { label: "WhatsApp", icon: whatsappIcon },
  telegram: { label: "Telegram", icon: telegramIcon },
};

export default function ChatbotPreview({ draft, channels = ["website"], chatbotId }: ChatbotPreviewProps) {
  const activeChannels = channels.length > 0 ? channels : ["website"];
  const [selectedChannel, setSelectedChannel] = useState(activeChannels[0]);

  // If selectedChannel is no longer in the list, reset
  const current = activeChannels.includes(selectedChannel) ? selectedChannel : activeChannels[0];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Channel switcher pills — only show when multiple channels */}
      {activeChannels.length > 1 && (
        <div className="flex items-center gap-1 rounded-full bg-muted p-1">
          {activeChannels.map((ch) => {
            const config = CHANNEL_CONFIG[ch];
            if (!config) return null;
            const isActive = current === ch;
            return (
              <button
                key={ch}
                onClick={() => setSelectedChannel(ch)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {config.icon ? (
                  <img src={config.icon} alt="" className="h-4 w-4" />
                ) : (
                  <Globe className="h-3 w-3" />
                )}
                {config.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Channel-specific preview */}
      {current === "website" && <WebsitePreview draft={draft} chatbotId={chatbotId} />}
      {current === "messenger" && <MessengerPreview draft={draft} chatbotId={chatbotId} />}
      {current === "whatsapp" && <WhatsAppPreview draft={draft} chatbotId={chatbotId} />}
      {current === "telegram" && <TelegramPreview draft={draft} chatbotId={chatbotId} />}
    </div>
  );
}
