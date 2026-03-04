import { useQuery } from "wasp/client/operations";
import { getChatbot } from "wasp/client/operations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../client/components/ui/tabs";
import { Globe, MessageCircle, Phone, Send } from "lucide-react";
import DeployWebsite from "./deploy/DeployWebsite";
import DeployMessenger from "./deploy/DeployMessenger";
import DeployWhatsApp from "./deploy/DeployWhatsApp";
import DeployTelegram from "./deploy/DeployTelegram";

interface WizardStepDeployProps {
  chatbotId: string;
  channels: string[];
  draft: Record<string, any>;
  onUpdate: (updates: Record<string, any>) => void;
}

const CHANNEL_CONFIG: Record<
  string,
  { label: string; icon: typeof Globe }
> = {
  website: { label: "Website", icon: Globe },
  messenger: { label: "Messenger", icon: MessageCircle },
  whatsapp: { label: "WhatsApp", icon: Phone },
  telegram: { label: "Telegram", icon: Send },
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
  const defaultTab = activeChannels[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Deploy</h3>
        <p className="text-muted-foreground text-sm">
          Configure deployment for each channel
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full">
          {activeChannels.map((ch) => {
            const config = CHANNEL_CONFIG[ch];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <TabsTrigger key={ch} value={ch} className="flex-1 gap-1 px-2 text-xs">
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {activeChannels.includes("website") && (
          <TabsContent value="website" className="mt-4">
            <DeployWebsite
              chatbotId={chatbotId}
              channel={channelRecords.find((c: any) => c.channel === "website")}
              draft={draft}
              onUpdate={onUpdate}
            />
          </TabsContent>
        )}

        {activeChannels.includes("messenger") && (
          <TabsContent value="messenger" className="mt-4">
            <DeployMessenger
              chatbotId={chatbotId}
              channel={channelRecords.find((c: any) => c.channel === "messenger")}
            />
          </TabsContent>
        )}

        {activeChannels.includes("whatsapp") && (
          <TabsContent value="whatsapp" className="mt-4">
            <DeployWhatsApp
              chatbotId={chatbotId}
              channel={channelRecords.find((c: any) => c.channel === "whatsapp")}
            />
          </TabsContent>
        )}

        {activeChannels.includes("telegram") && (
          <TabsContent value="telegram" className="mt-4">
            <DeployTelegram
              chatbotId={chatbotId}
              channel={channelRecords.find((c: any) => c.channel === "telegram")}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
