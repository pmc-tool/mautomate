import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Switch } from "../../client/components/ui/switch";
import { cn } from "../../client/utils";
import { Bot, MessageCircle, Headphones, Sparkles, Cpu, BrainCircuit } from "lucide-react";

interface WizardStepCustomizeProps {
  draft: Record<string, any>;
  onUpdate: (updates: Record<string, any>) => void;
}

const PRESET_AVATARS = [
  { id: "bot", Icon: Bot },
  { id: "message", Icon: MessageCircle },
  { id: "headphones", Icon: Headphones },
  { id: "sparkles", Icon: Sparkles },
  { id: "cpu", Icon: Cpu },
  { id: "brain", Icon: BrainCircuit },
];

const PRESET_COLORS = [
  "#272733",
  "#67D97C",
  "#E7AC47",
  "#9D74C9",
  "#017BE5",
];

const TOGGLES = [
  { key: "isEmailCollect", label: "Email Collect" },
  { key: "isContact", label: "Contact" },
  { key: "isEmoji", label: "Emoji" },
  { key: "isAttachment", label: "Attachment" },
  { key: "showLogo", label: "Show Logo" },
  { key: "showDateTime", label: "Show Date/Time" },
];

export default function WizardStepCustomize({ draft, onUpdate }: WizardStepCustomizeProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Customize</h3>
        <p className="text-muted-foreground text-sm">
          Customize the appearance of your chatbot
        </p>
      </div>

      {/* Avatar Selection */}
      <div className="space-y-3">
        <Label>Avatar</Label>
        <div className="grid grid-cols-6 gap-3">
          {PRESET_AVATARS.map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => onUpdate({ avatar: id })}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all",
                draft.avatar === id
                  ? "border-primary ring-primary/20 ring-2"
                  : "border-muted hover:border-primary/50"
              )}
              style={{ backgroundColor: draft.color || "#017BE5" }}
            >
              <Icon className="h-6 w-6 text-white" />
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="space-y-3">
        <Label>Accent Color</Label>
        <div className="flex items-center gap-3">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate({ color })}
              className={cn(
                "h-9 w-9 rounded-full border-2 transition-all",
                draft.color === color
                  ? "border-primary ring-primary/20 scale-110 ring-2"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <Input
            type="color"
            value={draft.color || "#017BE5"}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="h-9 w-9 cursor-pointer rounded-full border-0 p-0"
          />
        </div>
      </div>

      {/* Toggle Switches */}
      <div className="space-y-3">
        <Label>Options</Label>
        <div className="space-y-3">
          {TOGGLES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch
                checked={draft[key] ?? true}
                onCheckedChange={(checked) => onUpdate({ [key]: checked })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Position */}
      <div className="space-y-3">
        <Label>Position</Label>
        <div className="flex gap-3">
          {(["left", "right"] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => onUpdate({ position: pos })}
              className={cn(
                "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                draft.position === pos
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              )}
            >
              <div className="relative h-12 w-20 rounded-md border bg-muted">
                <div
                  className={cn(
                    "absolute bottom-1 h-3 w-3 rounded-full",
                    pos === "left" ? "left-1" : "right-1"
                  )}
                  style={{ backgroundColor: draft.color || "#017BE5" }}
                />
              </div>
              <span className="text-xs font-medium capitalize">{pos}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
