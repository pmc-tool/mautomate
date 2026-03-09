import { useState } from "react";
import { getAllMoods, getTracksByMood, type MusicMood } from "../musicLibrary";
import { Music } from "lucide-react";

interface MusicPickerProps {
  selectedTrackId: string | null;
  onSelect: (trackId: string) => void;
}

const MOOD_LABELS: Record<MusicMood, string> = {
  epic: "Epic",
  calm: "Calm",
  mysterious: "Mysterious",
  upbeat: "Upbeat",
  dramatic: "Dramatic",
  romantic: "Romantic",
  adventure: "Adventure",
  sad: "Sad",
  fantasy: "Fantasy",
  inspirational: "Inspirational",
};

export function MusicPicker({ selectedTrackId, onSelect }: MusicPickerProps) {
  const moods = getAllMoods();
  const [activeMood, setActiveMood] = useState<MusicMood>(moods[0]);
  const tracks = getTracksByMood(activeMood);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Background Music
      </h3>

      {/* Mood tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {moods.map((mood) => (
          <button
            key={mood}
            type="button"
            onClick={() => setActiveMood(mood)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeMood === mood
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {MOOD_LABELS[mood]}
          </button>
        ))}
      </div>

      {/* Track cards */}
      <div className="space-y-2">
        {tracks.map((track) => {
          const isSelected = selectedTrackId === track.id;

          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelect(track.id)}
              className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/20"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? "bg-primary" : "bg-muted"
                }`}
              >
                <Music className={`h-5 w-5 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{track.name}</div>
                <div className="truncate text-xs text-muted-foreground">{track.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
