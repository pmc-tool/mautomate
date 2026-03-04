import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Textarea } from "../../client/components/ui/textarea";
import { Switch } from "../../client/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import { cn } from "../../client/utils";
import { Globe, MessageCircle, Phone, Send } from "lucide-react";
import { saveChatbotChannel, deleteChatbotChannel } from "wasp/client/operations";
import { useToast } from "../../client/hooks/use-toast";

interface WizardStepConfigureProps {
  draft: Record<string, any>;
  onUpdate: (updates: Record<string, any>) => void;
  chatbotId: string;
  channelRecords: any[];
}

const LANGUAGES = [
  { value: "auto", label: "Auto Detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "tr", label: "Turkish" },
];

const CHANNEL_CARDS = [
  {
    key: "website",
    icon: Globe,
    label: "Website",
    description: "Embed on your website",
  },
  {
    key: "messenger",
    icon: MessageCircle,
    label: "Messenger",
    description: "Facebook Messenger bot",
  },
  {
    key: "whatsapp",
    icon: Phone,
    label: "WhatsApp",
    description: "WhatsApp Business bot",
  },
  {
    key: "telegram",
    icon: Send,
    label: "Telegram",
    description: "Telegram bot",
  },
];

export default function WizardStepConfigure({
  draft,
  onUpdate,
  chatbotId,
  channelRecords,
}: WizardStepConfigureProps) {
  const { toast } = useToast();
  const selectedChannels: string[] = draft.channels || ["website"];

  const handleToggleChannel = async (channel: string) => {
    const isSelected = selectedChannels.includes(channel);

    // Must have at least 1 channel
    if (isSelected && selectedChannels.length <= 1) {
      toast({ title: "At least one channel is required", variant: "destructive" });
      return;
    }

    if (isSelected) {
      // Remove channel — find the record and delete
      const record = channelRecords.find((r: any) => r.channel === channel);
      if (record) {
        try {
          await deleteChatbotChannel({ id: record.id });
        } catch (err: any) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
          return;
        }
      }
      onUpdate({ channels: selectedChannels.filter((c) => c !== channel) });
    } else {
      // Add channel
      try {
        await saveChatbotChannel({ chatbotId, channel: channel as any });
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        return;
      }
      onUpdate({ channels: [...selectedChannels, channel] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configure</h3>
        <p className="text-muted-foreground text-sm">
          Set up the basic settings for your chatbot
        </p>
      </div>

      {/* Channel Selection */}
      <div className="space-y-3">
        <Label>Channels</Label>
        <div className="grid grid-cols-2 gap-3">
          {CHANNEL_CARDS.map((card) => {
            const isSelected = selectedChannels.includes(card.key);
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => handleToggleChannel(card.key)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{card.label}</p>
                  <p className="text-muted-foreground text-[11px]">{card.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          Select where you want to deploy your chatbot. At least one channel is required.
        </p>
      </div>

      {/* Existing form fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={draft.title || ""}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="My Chatbot"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bubbleMessage">Bubble Message</Label>
          <Input
            id="bubbleMessage"
            value={draft.bubbleMessage || ""}
            onChange={(e) => onUpdate({ bubbleMessage: e.target.value })}
            placeholder="Hi! How can I help you?"
          />
          <p className="text-muted-foreground text-xs">
            Shown next to the chat bubble before the user opens the chat
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcomeMessage">Welcome Message</Label>
          <Input
            id="welcomeMessage"
            value={draft.welcomeMessage || ""}
            onChange={(e) => onUpdate({ welcomeMessage: e.target.value })}
            placeholder="Hello! How can I assist you today?"
          />
          <p className="text-muted-foreground text-xs">
            First message shown when the chat window opens
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions</Label>
          <Textarea
            id="instructions"
            rows={4}
            value={draft.instructions || ""}
            onChange={(e) => onUpdate({ instructions: e.target.value })}
            placeholder="You are a helpful assistant for our company. Answer questions about our products and services..."
          />
          <p className="text-muted-foreground text-xs">
            Tell the AI how to behave and what to know about your business
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Don't go beyond instructions</Label>
            <p className="text-muted-foreground text-xs">
              Only answer questions related to the instructions above
            </p>
          </div>
          <Switch
            checked={draft.dontGoBeyond || false}
            onCheckedChange={(checked) => onUpdate({ dontGoBeyond: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={draft.language || "auto"}
            onValueChange={(value) => onUpdate({ language: value === "auto" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Auto Detect" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
