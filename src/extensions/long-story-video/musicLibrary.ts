// musicLibrary.ts — Royalty-free background music track registry
// Standalone service, zero external dependencies

export type MusicMood = "epic" | "calm" | "mysterious" | "upbeat" | "dramatic";

export interface MusicTrack {
  id: string;
  name: string;
  mood: MusicMood;
  fileName: string;
  durationSec: number;
  description: string;
  bpm?: number;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  // ── Epic (3) ──────────────────────────────────────────────
  {
    id: "epic-001",
    name: "Rise of Titans",
    mood: "epic",
    fileName: "rise-of-titans.mp3",
    durationSec: 162,
    description:
      "Sweeping orchestral build with layered strings, thunderous timpani, and a triumphant brass climax.",
    bpm: 92,
  },
  {
    id: "epic-002",
    name: "Forge of Legends",
    mood: "epic",
    fileName: "forge-of-legends.mp3",
    durationSec: 144,
    description:
      "Cinematic war drums driving beneath soaring violin melodies, building to an explosive finale.",
    bpm: 108,
  },
  {
    id: "epic-003",
    name: "Beyond the Horizon",
    mood: "epic",
    fileName: "beyond-the-horizon.mp3",
    durationSec: 178,
    description:
      "Grand orchestral anthem with French horns, choir swells, and a steady percussive march.",
    bpm: 85,
  },

  // ── Calm (2) ──────────────────────────────────────────────
  {
    id: "calm-001",
    name: "Morning Light",
    mood: "calm",
    fileName: "morning-light.mp3",
    durationSec: 156,
    description:
      "Gentle solo piano over soft ambient pads, evoking a quiet sunrise over still water.",
    bpm: 68,
  },
  {
    id: "calm-002",
    name: "Driftwood",
    mood: "calm",
    fileName: "driftwood.mp3",
    durationSec: 138,
    description:
      "Warm acoustic guitar fingerpicking blended with airy synth textures and distant wind chimes.",
    bpm: 74,
  },

  // ── Mysterious (2) ────────────────────────────────────────
  {
    id: "mysterious-001",
    name: "Beneath the Surface",
    mood: "mysterious",
    fileName: "beneath-the-surface.mp3",
    durationSec: 148,
    description:
      "Dark ambient drone layered with subtle metallic resonances and whispered reverb tails.",
    bpm: 60,
  },
  {
    id: "mysterious-002",
    name: "Obsidian Corridor",
    mood: "mysterious",
    fileName: "obsidian-corridor.mp3",
    durationSec: 132,
    description:
      "Eerie synth arpeggios over a low sub-bass pulse, creating an atmosphere of creeping tension.",
    bpm: 72,
  },

  // ── Upbeat (3) ────────────────────────────────────────────
  {
    id: "upbeat-001",
    name: "Neon Pulse",
    mood: "upbeat",
    fileName: "neon-pulse.mp3",
    durationSec: 126,
    description:
      "Energetic electronic track with punchy kicks, bright synth leads, and a driving four-on-the-floor beat.",
    bpm: 128,
  },
  {
    id: "upbeat-002",
    name: "Sunlit Road",
    mood: "upbeat",
    fileName: "sunlit-road.mp3",
    durationSec: 142,
    description:
      "Bright indie pop with strummed acoustic guitar, handclaps, and an infectious whistled melody.",
    bpm: 116,
  },
  {
    id: "upbeat-003",
    name: "Go Time",
    mood: "upbeat",
    fileName: "go-time.mp3",
    durationSec: 118,
    description:
      "High-energy positive pop with staccato piano chords, uplifting strings, and a catchy hook.",
    bpm: 122,
  },

  // ── Dramatic (2) ──────────────────────────────────────────
  {
    id: "dramatic-001",
    name: "Final Stand",
    mood: "dramatic",
    fileName: "final-stand.mp3",
    durationSec: 168,
    description:
      "Intense orchestral piece with aggressive brass crescendos, rapid string ostinatos, and pounding timpani.",
    bpm: 96,
  },
  {
    id: "dramatic-002",
    name: "Edge of Collapse",
    mood: "dramatic",
    fileName: "edge-of-collapse.mp3",
    durationSec: 154,
    description:
      "Dark, tension-filled score featuring staccato cello, ominous low brass, and explosive percussion hits.",
    bpm: 88,
  },
];

/**
 * Returns all tracks matching the given mood.
 */
export function getTracksByMood(mood: MusicMood): MusicTrack[] {
  return MUSIC_TRACKS.filter((t) => t.mood === mood);
}

/**
 * Returns a single track by its unique ID, or undefined if not found.
 */
export function getTrackById(id: string): MusicTrack | undefined {
  return MUSIC_TRACKS.find((t) => t.id === id);
}

/**
 * Returns the list of all available mood categories.
 */
export function getAllMoods(): MusicMood[] {
  return ["epic", "calm", "mysterious", "upbeat", "dramatic"];
}

/**
 * Returns the first (default) track for a given mood.
 * Throws if no tracks exist for the mood (should never happen with the
 * built-in library, but guards against future misconfiguration).
 */
export function getDefaultTrackForMood(mood: MusicMood): MusicTrack {
  const tracks = getTracksByMood(mood);
  if (tracks.length === 0) {
    throw new Error(`No tracks available for mood: ${mood}`);
  }
  return tracks[0];
}
