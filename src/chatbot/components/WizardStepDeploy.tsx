import { useQuery } from "wasp/client/operations";
import { getChatbot } from "wasp/client/operations";
import { cn } from "../../client/utils";
import { Globe, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import DeployWebsite from "./deploy/DeployWebsite";
import DeployMessenger from "./deploy/DeployMessenger";
import DeployWhatsApp from "./deploy/DeployWhatsApp";
import DeployTelegram from "./deploy/DeployTelegram";

// Platform icons
import messengerIcon from "../../social-connect/icons/messenger.svg";
import whatsappIcon from "../../social-connect/icons/whatsapp.svg";
import telegramIcon from "../../social-connect/icons/telegram.svg";

interface WizardStepDeployProps {
  chatbotId: string;
  channels: string[];
  draft: Record<string, any>;
  onUpdate: (updates: Record<string, any>) => void;
}

const CHANNEL_CONFIG: Record<string, { label: string; img?: string }> = {
  website: { label: "Website" },
  messenger: { label: "Messenger", img: messengerIcon },
  whatsapp: { label: "WhatsApp", img: whatsappIcon },
  telegram: { label: "Telegram", img: telegramIcon },
};

export default function WizardStepDeploy({
  chatbotId,
  channels,
  draft,
  onUpdate,
}: WizardStepDeployProps) {
  const { data: chatbot } = useQuery(getChatbot, { id: chatbotId });
  const channelRecords = chatbot?.channels || [];
  const activeChannels = channels.length > 0 ? channels : ["website"];
  const [selectedChannel, setSelectedChannel] = useState(activeChannels[0]);
  const current = activeChannels.includes(selectedChannel) ? selectedChannel : activeChannels[0];

  return (
    <div className="space-y-6">
      {/* Channel Cards */}
      <div className="flex gap-2">
        {activeChannels.map((ch) => {
          const config = CHANNEL_CONFIG[ch];
          if (!config) return null;
          const isActive = current === ch;
          return (
            <button
              key={ch}
              onClick={() => setSelectedChannel(ch)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all",
                isActive
                  ? "border-primary bg-primary/5 text-foreground shadow-sm"
                  : "border-muted text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {config.img ? (
                <img src={config.img} alt={config.label} className="h-5 w-5 object-contain" />
              ) : (
                <Globe className="h-4 w-4 text-blue-500" />
              )}
              <span className="hidden sm:inline">{config.label}</span>
              {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
            </button>
          );
        })}
      </div>

      {/* Channel Content */}
      <div className="rounded-xl border bg-card p-1">
        {current === "website" && (
          <DeployWebsite
            chatbotId={chatbotId}
            channel={channelRecords.find((c: any) => c.channel === "website")}
            draft={draft}
            onUpdate={onUpdate}
          />
        )}
        {current === "messenger" && (
          <DeployMessenger
            chatbotId={chatbotId}
            channel={channelRecords.find((c: any) => c.channel === "messenger")}
          />
        )}
        {current === "whatsapp" && (
          <DeployWhatsApp
            chatbotId={chatbotId}
            channel={channelRecords.find((c: any) => c.channel === "whatsapp")}
          />
        )}
        {current === "telegram" && (
          <DeployTelegram
            chatbotId={chatbotId}
            channel={channelRecords.find((c: any) => c.channel === "telegram")}
          />
        )}
      </div>
    </div>
  );
}
