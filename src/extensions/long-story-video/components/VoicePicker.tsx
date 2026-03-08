import { VOICE_OPTIONS } from "../ttsService";
import { Mic } from "lucide-react";

interface VoicePickerProps {
  selectedVoiceId: string;
  onSelect: (voiceId: string) => void;
}

export function VoicePicker({ selectedVoiceId, onSelect }: VoicePickerProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
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
                  ? "border-blue-500 bg-blue-600/10 ring-1 ring-blue-500"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <Mic className={`h-4 w-4 ${isSelected ? "text-blue-400" : "text-gray-500"}`} />
                <span className="font-medium text-white">{voice.name}</span>
              </div>
              <span className={`text-xs ${isSelected ? "text-blue-300" : "text-gray-400"}`}>
                {voice.style}
              </span>
              <span className="text-xs text-gray-500">{voice.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
