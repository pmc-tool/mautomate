// ---------------------------------------------------------------------------
// Video Studio — Voice Presets
// Stored as metadata and sent to fal.ai models that support voice/audio.
// ---------------------------------------------------------------------------

export interface VoicePreset {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  accent: string;
  style: "professional" | "casual" | "dramatic" | "warm" | "authoritative";
  description: string;
  previewText: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  // ---- Professional ----
  {
    id: "pro-anchor",
    name: "News Anchor",
    gender: "male",
    accent: "American",
    style: "professional",
    description: "Clear, authoritative broadcast voice with confident delivery.",
    previewText: "Breaking news tonight — a major development in...",
  },
  {
    id: "pro-corporate",
    name: "Corporate Narrator",
    gender: "female",
    accent: "American",
    style: "professional",
    description: "Polished, trustworthy tone ideal for business content.",
    previewText: "Our company is committed to innovation and excellence...",
  },
  {
    id: "pro-documentary",
    name: "Documentary",
    gender: "male",
    accent: "British",
    style: "professional",
    description: "Rich, measured narration perfect for documentaries.",
    previewText: "In the heart of the ancient forest, a hidden world awaits...",
  },

  // ---- Casual ----
  {
    id: "casual-friendly",
    name: "Friendly Guide",
    gender: "female",
    accent: "American",
    style: "casual",
    description: "Approachable, upbeat tone great for tutorials and social content.",
    previewText: "Hey everyone! Today I'm going to show you something amazing...",
  },
  {
    id: "casual-vlogger",
    name: "Vlogger",
    gender: "male",
    accent: "American",
    style: "casual",
    description: "Natural, conversational style like a popular content creator.",
    previewText: "What's up guys! So I just discovered this incredible place...",
  },
  {
    id: "casual-storyteller",
    name: "Storyteller",
    gender: "female",
    accent: "Australian",
    style: "casual",
    description: "Engaging, warm narration that draws the listener in.",
    previewText: "Picture this — you're standing at the edge of a cliff...",
  },

  // ---- Dramatic ----
  {
    id: "dramatic-epic",
    name: "Epic Narrator",
    gender: "male",
    accent: "British",
    style: "dramatic",
    description: "Bold, cinematic voice for trailers and dramatic content.",
    previewText: "In a world where nothing is as it seems...",
  },
  {
    id: "dramatic-suspense",
    name: "Suspense",
    gender: "female",
    accent: "British",
    style: "dramatic",
    description: "Intense, atmospheric voice that builds tension.",
    previewText: "The clock is ticking. Every second counts...",
  },
  {
    id: "dramatic-inspirational",
    name: "Inspirational",
    gender: "male",
    accent: "American",
    style: "dramatic",
    description: "Powerful, motivational tone for uplifting content.",
    previewText: "Every great achievement begins with a single step...",
  },

  // ---- Warm ----
  {
    id: "warm-educator",
    name: "Educator",
    gender: "female",
    accent: "American",
    style: "warm",
    description: "Patient, encouraging tone ideal for educational content.",
    previewText: "Let's break this down step by step so it's easy to understand...",
  },
  {
    id: "warm-wellness",
    name: "Wellness Coach",
    gender: "female",
    accent: "British",
    style: "warm",
    description: "Soothing, calming voice for wellness and meditation content.",
    previewText: "Take a deep breath. Let go of all the tension...",
  },
  {
    id: "warm-host",
    name: "Podcast Host",
    gender: "male",
    accent: "American",
    style: "warm",
    description: "Personable, relatable voice that feels like a conversation.",
    previewText: "Welcome back to the show! Today we have something special...",
  },
];

export const VOICE_STYLES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "dramatic", label: "Dramatic" },
  { id: "warm", label: "Warm" },
] as const;

export function getVoicePresetById(id: string): VoicePreset | undefined {
  return VOICE_PRESETS.find((v) => v.id === id);
}

export function getVoicePresetsByStyle(style: string): VoicePreset[] {
  return VOICE_PRESETS.filter((v) => v.style === style);
}
