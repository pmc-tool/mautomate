import { useState } from "react";
import { MUSIC_TRACKS, getAllMoods, getTracksByMood, type MusicMood } from "../musicLibrary";
import { Music, Clock } from "lucide-react";

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
};

export function MusicPicker({ selectedTrackId, onSelect }: MusicPickerProps) {
  const moods = getAllMoods();
  const [activeMood, setActiveMood] = useState<MusicMood>(moods[0]);
  const tracks = getTracksByMood(activeMood);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
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
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
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
          const minutes = Math.floor(track.durationSec / 60);
          const seconds = track.durationSec % 60;

          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelect(track.id)}
              className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-600/10 ring-1 ring-blue-500"
                  : "border-gray-700 bg-gray-800 hover:border-gray-600"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                <Music className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-white">{track.name}</div>
                <div className="truncate text-xs text-gray-400">{track.description}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
              {track.bpm && (
                <span className="shrink-0 text-xs text-gray-600">{track.bpm} bpm</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
