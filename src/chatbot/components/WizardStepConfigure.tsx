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
import { Globe, MessageCircle, Phone, Send, Check } from "lucide-react";
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
  { value: "bn", label: "Bengali" },
];

const CHANNEL_CARDS = [
  { key: "website", icon: Globe, label: "Website", description: "Embed on your website" },
  { key: "messenger", icon: MessageCircle, label: "Messenger", description: "Facebook Messenger" },
  { key: "whatsapp", icon: Phone, label: "WhatsApp", description: "WhatsApp Business" },
  { key: "telegram", icon: Send, label: "Telegram", description: "Telegram bot" },
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
    if (isSelected && selectedChannels.length <= 1) {
      toast({ title: "At least one channel is required", variant: "destructive" });
      return;
    }

    if (isSelected) {
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
    <div className="space-y-7">
      {/* Title */}
      <div className="space-y-2">
        <Label className="text-foreground font-medium">Chatbot Title</Label>
        <Input
          value={draft.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="MagicBot"
          className="h-11 rounded-xl"
        />
      </div>

      {/* Bubble Message */}
      <div className="space-y-2">
        <Label className="text-foreground font-medium">Bubble Message</Label>
        <Input
          value={draft.bubbleMessage || ""}
          onChange={(e) => onUpdate({ bubbleMessage: e.target.value })}
          placeholder="Hi! How can I help you?"
          className="h-11 rounded-xl"
        />
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          Shown next to the chat bubble before the user opens the chat
        </p>
      </div>

      {/* Welcome Message */}
      <div className="space-y-2">
        <Label className="text-foreground font-medium">Welcome Message</Label>
        <Input
          value={draft.welcomeMessage || ""}
          onChange={(e) => onUpdate({ welcomeMessage: e.target.value })}
          placeholder="Hello! How can I assist you today?"
          className="h-11 rounded-xl"
        />
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          First message shown when the chat window opens
        </p>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <Label className="text-foreground font-medium">Chatbot Instructions</Label>
        <Textarea
          rows={4}
          value={draft.instructions || ""}
          onChange={(e) => onUpdate({ instructions: e.target.value })}
          placeholder="You are a helpful assistant for our company. Answer questions about our products and services..."
          className="rounded-xl resize-none"
        />
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          Tell the AI how to behave and what to know about your business
        </p>
      </div>

      {/* Don't go beyond */}
      <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
        <div>
          <Label className="text-foreground font-medium">Don't go beyond instructions</Label>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Only answer questions related to the instructions above
          </p>
        </div>
        <Switch
          checked={draft.dontGoBeyond || false}
          onCheckedChange={(checked) => onUpdate({ dontGoBeyond: checked })}
        />
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label className="text-foreground font-medium">Language</Label>
        <Select
          value={draft.language || "auto"}
          onValueChange={(value) => onUpdate({ language: value === "auto" ? "" : value })}
        >
          <SelectTrigger className="h-11 rounded-xl">
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

      {/* Channels */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">Channels</Label>
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
                  "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all hover:scale-[1.02]",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40"
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{card.label}</p>
                  <p className="text-muted-foreground text-[10px]">{card.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground/60">
          Select where you want to deploy your chatbot
        </p>
      </div>
    </div>
  );
}
