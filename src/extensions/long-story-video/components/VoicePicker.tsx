import { VOICE_OPTIONS } from "../ttsService";
import { Mic } from "lucide-react";

interface VoicePickerProps {
  selectedVoiceId: string;
  onSelect: (voiceId: string) => void;
}

export function VoicePicker({ selectedVoiceId, onSelect }: VoicePickerProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Narrator Voice
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {VOICE_OPTIONS.map((voice) => {
          const isSelected = selectedVoiceId === voice.id;
          return (
            <button
              key={voice.id}
              type="button"
              onClick={() => onSelect(voice.id)}
              className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <Mic className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <span className="font-medium text-foreground">{voice.name}</span>
              </div>
              <span className={`text-xs ${isSelected ? "text-primary/80" : "text-muted-foreground"}`}>
                {voice.style}
              </span>
              <span className="text-xs text-muted-foreground/70">{voice.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
