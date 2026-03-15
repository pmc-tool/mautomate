import { VOICE_OPTIONS } from "../ttsService";
import { Mic } from "lucide-react";
import { useState } from "react";

interface VoicePickerProps {
  selectedVoiceId: string;
  onSelect: (voiceId: string) => void;
}

const BRAND = "#bd711d";

export function VoicePicker({ selectedVoiceId, onSelect }: VoicePickerProps) {
  const [filter, setFilter] = useState<"all" | "male" | "female">("all");

  const filtered = VOICE_OPTIONS.filter(
    (v) => filter === "all" || v.gender === filter
  );

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Narrator Voice
      </h3>

      {/* Gender filter */}
      <div className="mb-3 flex gap-2">
        {(["all", "female", "male"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f
                ? "text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            style={filter === f ? { backgroundColor: BRAND } : undefined}
          >
            {f === "all" ? "All" : f === "female" ? "Female" : "Male"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((voice) => {
          const isSelected = selectedVoiceId === voice.id;
          return (
            <button
              key={voice.id}
              type="button"
              onClick={() => onSelect(voice.id)}
              className={`flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${
                isSelected
                  ? "ring-1"
                  : "border-border bg-card hover:shadow-sm"
              }`}
              style={
                isSelected
                  ? {
                      borderColor: BRAND,
                      backgroundColor: `${BRAND}08`,
                      boxShadow: `0 2px 8px ${BRAND}20, 0 0 0 1px ${BRAND}33`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2">
                <Mic
                  className="h-3.5 w-3.5"
                  style={{ color: isSelected ? BRAND : undefined }}
                />
                <span className="text-sm font-medium text-foreground">{voice.name}</span>
              </div>
              <span
                className="text-[11px]"
                style={{ color: isSelected ? BRAND : undefined }}
              >
                {voice.style}
              </span>
              <span className="text-[10px] text-muted-foreground/70">{voice.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
