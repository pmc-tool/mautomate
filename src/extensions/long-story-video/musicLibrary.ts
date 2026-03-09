// musicLibrary.ts — Royalty-free background music track registry
// Tracks sourced from Internet Archive: https://archive.org/download/royalty-free-music/

export type MusicMood =
  | "epic"
  | "calm"
  | "mysterious"
  | "upbeat"
  | "dramatic"
  | "romantic"
  | "adventure"
  | "sad"
  | "fantasy"
  | "inspirational";

export interface MusicTrack {
  id: string;
  name: string;
  mood: MusicMood;
  url: string;
  description: string;
}

const BASE_URL = "https://archive.org/download/royalty-free-music/";

function trackUrl(filename: string): string {
  return `${BASE_URL}${encodeURIComponent(filename)}`;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  // ── Epic (8) ──────────────────────────────────────────────────
  {
    id: "epic-001",
    name: "Epic Trailer",
    mood: "epic",
    url: trackUrl("Epic Trailer (Royalty Free Music).mp3"),
    description: "Cinematic trailer music with sweeping orchestral builds and powerful crescendos.",
  },
  {
    id: "epic-002",
    name: "Epic Inspiration",
    mood: "epic",
    url: trackUrl("Epic Inspiration.mp3"),
    description: "Uplifting orchestral piece with soaring melodies and inspirational energy.",
  },
  {
    id: "epic-003",
    name: "Orchestral Epic Trailer",
    mood: "epic",
    url: trackUrl("Orchestral Epic Trailer (Heroic Cinematic).mp3"),
    description: "Heroic cinematic orchestral track with bold brass and dramatic percussion.",
  },
  {
    id: "epic-004",
    name: "Technology Cinematic",
    mood: "epic",
    url: trackUrl("Technology Cinematic (Epic Orchestral).mp3"),
    description: "Epic orchestral piece blending technology themes with cinematic grandeur.",
  },
  {
    id: "epic-005",
    name: "Viking Battle",
    mood: "epic",
    url: trackUrl("Viking Battle (Epic Trailer).mp3"),
    description: "Intense battle-themed trailer music with thunderous drums and fierce energy.",
  },
  {
    id: "epic-006",
    name: "Justice Mayhem",
    mood: "epic",
    url: trackUrl("Justice Mayhem (Epic Trailer).mp3"),
    description: "Action-packed epic trailer music with relentless momentum and power.",
  },
  {
    id: "epic-007",
    name: "Oblivion Scourge",
    mood: "epic",
    url: trackUrl("Oblivion Scourge (Epic Trailer).mp3"),
    description: "Dark epic trailer with ominous undertones and explosive orchestral hits.",
  },
  {
    id: "epic-008",
    name: "Glory Horizon",
    mood: "epic",
    url: trackUrl("Glory Horizon (Triumphant Orchestral).mp3"),
    description: "Triumphant orchestral anthem with soaring brass and victorious energy.",
  },

  // ── Calm (8) ──────────────────────────────────────────────────
  {
    id: "calm-001",
    name: "Abstract Chill",
    mood: "calm",
    url: trackUrl("Abstract Chill (Piano Calm Background).mp3"),
    description: "Gentle piano over calm ambient pads, perfect for relaxed storytelling.",
  },
  {
    id: "calm-002",
    name: "Ethereal Piano",
    mood: "calm",
    url: trackUrl("Ethereal Piano.mp3"),
    description: "Dreamy, floating piano melodies with an ethereal atmosphere.",
  },
  {
    id: "calm-003",
    name: "Lo-Fi Calming",
    mood: "calm",
    url: trackUrl("Lo-Fi Calming (Relaxing Meditative).mp3"),
    description: "Relaxing lo-fi beats with meditative qualities and warm textures.",
  },
  {
    id: "calm-004",
    name: "Peaceful Beats",
    mood: "calm",
    url: trackUrl("Peaceful Beats.mp3"),
    description: "Soft, peaceful rhythms creating a tranquil background atmosphere.",
  },
  {
    id: "calm-005",
    name: "Meditation",
    mood: "calm",
    url: trackUrl("Meditation.mp3"),
    description: "Soothing ambient music designed for meditation and deep focus.",
  },
  {
    id: "calm-006",
    name: "Provence Serenity",
    mood: "calm",
    url: trackUrl("Provence Serenity.mp3"),
    description: "Serene acoustic piece evoking peaceful countryside landscapes.",
  },
  {
    id: "calm-007",
    name: "Sunset Serenity",
    mood: "calm",
    url: trackUrl("Sunset Serenity.mp3"),
    description: "Warm, calming tones capturing the beauty of a sunset.",
  },
  {
    id: "calm-008",
    name: "Tranquil Tunes",
    mood: "calm",
    url: trackUrl("Tranquil Tunes.mp3"),
    description: "Gentle, flowing melodies creating a peaceful and restful mood.",
  },

  // ── Mysterious (6) ────────────────────────────────────────────
  {
    id: "mysterious-001",
    name: "Bloom Umbra",
    mood: "mysterious",
    url: trackUrl("Bloom Umbra (Ambient).mp3"),
    description: "Dark ambient textures with shadowy, evolving soundscapes.",
  },
  {
    id: "mysterious-002",
    name: "Dusk Infinity",
    mood: "mysterious",
    url: trackUrl("Dusk Infinity (Ambient).mp3"),
    description: "Atmospheric ambient piece with infinite, twilight-like depth.",
  },
  {
    id: "mysterious-003",
    name: "Silent Echoes",
    mood: "mysterious",
    url: trackUrl("Silent Echoes (Ambient).mp3"),
    description: "Hauntingly quiet ambient with distant echoes and subtle reverb.",
  },
  {
    id: "mysterious-004",
    name: "Eclipse Aurora",
    mood: "mysterious",
    url: trackUrl("Eclipse Aurora (Ambient).mp3"),
    description: "Enigmatic ambient soundscape blending darkness with ethereal light.",
  },
  {
    id: "mysterious-005",
    name: "Fading Memories",
    mood: "mysterious",
    url: trackUrl("Fading Memories (Ambient).mp3"),
    description: "Melancholic ambient with fading tones and nostalgic atmosphere.",
  },
  {
    id: "mysterious-006",
    name: "Celestial Stellar",
    mood: "mysterious",
    url: trackUrl("Celestial Stellar (Ambient).mp3"),
    description: "Cosmic ambient piece with stellar, otherworldly textures.",
  },

  // ── Upbeat (6) ────────────────────────────────────────────────
  {
    id: "upbeat-001",
    name: "Groove Bliss",
    mood: "upbeat",
    url: trackUrl("Groove Bliss (Upbeat Funk).mp3"),
    description: "Funky, groovy track with infectious rhythm and positive energy.",
  },
  {
    id: "upbeat-002",
    name: "Soul Strut",
    mood: "upbeat",
    url: trackUrl("Soul Strut (Upbeat Funk).mp3"),
    description: "Soulful upbeat funk with confident swagger and warm bass.",
  },
  {
    id: "upbeat-003",
    name: "Happy Beach",
    mood: "upbeat",
    url: trackUrl("Happy Beach (Tropical House).mp3"),
    description: "Cheerful tropical house vibes perfect for summer content.",
  },
  {
    id: "upbeat-004",
    name: "Happy Summer",
    mood: "upbeat",
    url: trackUrl("Happy Summer (Royalty Free Music).mp3"),
    description: "Bright, carefree summer track with uplifting melodies.",
  },
  {
    id: "upbeat-005",
    name: "Summer Walk",
    mood: "upbeat",
    url: trackUrl("Summer Walk (Tropical House).mp3"),
    description: "Laid-back tropical house with sunny, feel-good energy.",
  },
  {
    id: "upbeat-006",
    name: "Island Escape",
    mood: "upbeat",
    url: trackUrl("Island Escape (Tropical House).mp3"),
    description: "Tropical house track evoking a carefree island getaway.",
  },

  // ── Dramatic (6) ──────────────────────────────────────────────
  {
    id: "dramatic-001",
    name: "Dramatic Trailer",
    mood: "dramatic",
    url: trackUrl("Dramatic Trailer.mp3"),
    description: "Intense, building trailer music with heavy orchestral drama.",
  },
  {
    id: "dramatic-002",
    name: "Brutal Terror",
    mood: "dramatic",
    url: trackUrl("Brutal Terror (Dark Trailer).mp3"),
    description: "Dark, menacing trailer music with brutal intensity.",
  },
  {
    id: "dramatic-003",
    name: "Reckoning Collapse",
    mood: "dramatic",
    url: trackUrl("Reckoning Collapse (Dark Trailer).mp3"),
    description: "Apocalyptic dark trailer with collapsing, chaotic energy.",
  },
  {
    id: "dramatic-004",
    name: "Quiver Dagger",
    mood: "dramatic",
    url: trackUrl("Quiver Dagger (Dark Trailer).mp3"),
    description: "Sharp, tense dark trailer with piercing suspense.",
  },
  {
    id: "dramatic-005",
    name: "Battle Cinematic Trailer",
    mood: "dramatic",
    url: trackUrl("Battle Cinematic Trailer (Royalty Free Music).mp3"),
    description: "Cinematic battle music with thunderous percussion and urgency.",
  },
  {
    id: "dramatic-006",
    name: "Storm Lament",
    mood: "dramatic",
    url: trackUrl("Storm Lament (Cinematic Orchestral).mp3"),
    description: "Cinematic orchestral piece with stormy intensity and emotional weight.",
  },

  // ── Romantic (5) ──────────────────────────────────────────────
  {
    id: "romantic-001",
    name: "Dreamy Reverie",
    mood: "romantic",
    url: trackUrl("Dreamy Reverie (Piano Romantic).mp3"),
    description: "Romantic piano piece with dreamy, tender melodies.",
  },
  {
    id: "romantic-002",
    name: "Affection Joy",
    mood: "romantic",
    url: trackUrl("Affection Joy (Piano Inspiration).mp3"),
    description: "Warm, joyful piano expressing affection and heartfelt emotion.",
  },
  {
    id: "romantic-003",
    name: "Bloom Open",
    mood: "romantic",
    url: trackUrl("Bloom Open (Piano Inspiration).mp3"),
    description: "Delicate piano piece capturing the feeling of blossoming love.",
  },
  {
    id: "romantic-004",
    name: "Journey Serenity",
    mood: "romantic",
    url: trackUrl("Journey Serenity (Piano Inspiration).mp3"),
    description: "Serene, flowing piano evoking a peaceful romantic journey.",
  },
  {
    id: "romantic-005",
    name: "Autumn Walk",
    mood: "romantic",
    url: trackUrl("Autumn Walk (Emotional Piano).mp3"),
    description: "Emotional piano piece with warm, autumnal nostalgia.",
  },

  // ── Adventure (5) ─────────────────────────────────────────────
  {
    id: "adventure-001",
    name: "Emotional Adventure",
    mood: "adventure",
    url: trackUrl("Emotional Adventure.mp3"),
    description: "Emotionally charged adventure music with cinematic scope.",
  },
  {
    id: "adventure-002",
    name: "Hopeful Travel",
    mood: "adventure",
    url: trackUrl("Hopeful Travel (Electronic Experimental).mp3"),
    description: "Experimental electronic track with hopeful, explorative energy.",
  },
  {
    id: "adventure-003",
    name: "Desert Wanderer",
    mood: "adventure",
    url: trackUrl("Desert Wanderer.mp3"),
    description: "Evocative track capturing the spirit of desert exploration.",
  },
  {
    id: "adventure-004",
    name: "Moonlit Caravan",
    mood: "adventure",
    url: trackUrl("Moonlit Caravan.mp3"),
    description: "Mystical journey music with caravan-like rhythm under moonlight.",
  },
  {
    id: "adventure-005",
    name: "Cinematic Electronic",
    mood: "adventure",
    url: trackUrl("Cinematic Electronic (Inspiration Background).mp3"),
    description: "Cinematic electronic piece blending inspiration with adventure.",
  },

  // ── Sad (4) ───────────────────────────────────────────────────
  {
    id: "sad-001",
    name: "Melancholic Beat",
    mood: "sad",
    url: trackUrl("Melancholic Beat (Royalty Free Music).mp3"),
    description: "Melancholic beat with sorrowful undertones and reflective mood.",
  },
  {
    id: "sad-002",
    name: "Sad Future Bass",
    mood: "sad",
    url: trackUrl("Sad Future Bass (Royalty Free Music).mp3"),
    description: "Emotional future bass with bittersweet drops and sad melodies.",
  },
  {
    id: "sad-003",
    name: "Sentimental Lo-Fi Piano",
    mood: "sad",
    url: trackUrl("Sentimental Lo-Fi Piano.mp3"),
    description: "Lo-fi piano with sentimental, tearful qualities and gentle warmth.",
  },
  {
    id: "sad-004",
    name: "Lo-Fi Emotional Beat",
    mood: "sad",
    url: trackUrl("Lo-Fi Emotional Beat.mp3"),
    description: "Emotional lo-fi beat with raw, vulnerable atmosphere.",
  },

  // ── Fantasy (5) ───────────────────────────────────────────────
  {
    id: "fantasy-001",
    name: "Fantasy Dream",
    mood: "fantasy",
    url: trackUrl("Fantasy Dream.mp3"),
    description: "Whimsical, dreamlike music with enchanting fantasy elements.",
  },
  {
    id: "fantasy-002",
    name: "Light Symphony",
    mood: "fantasy",
    url: trackUrl("Light Symphony (Cinematic Orchestral).mp3"),
    description: "Luminous cinematic orchestral piece with magical, uplifting tones.",
  },
  {
    id: "fantasy-003",
    name: "Arcane Chant",
    mood: "fantasy",
    url: trackUrl("Arcane Chant (Cinematic Orchestral).mp3"),
    description: "Mystical orchestral chant with arcane, spellbinding atmosphere.",
  },
  {
    id: "fantasy-004",
    name: "Twilight Essence",
    mood: "fantasy",
    url: trackUrl("Twilight Essence (Cinematic Orchestral).mp3"),
    description: "Ethereal orchestral piece capturing the magic of twilight.",
  },
  {
    id: "fantasy-005",
    name: "Mirage Rise",
    mood: "fantasy",
    url: trackUrl("Mirage Rise (Cinematic Orchestral).mp3"),
    description: "Cinematic orchestral track with shimmering, mirage-like grandeur.",
  },

  // ── Inspirational (4) ─────────────────────────────────────────
  {
    id: "inspirational-001",
    name: "Motivation Energy",
    mood: "inspirational",
    url: trackUrl("Motivation Energy.mp3"),
    description: "High-energy motivational track driving action and determination.",
  },
  {
    id: "inspirational-002",
    name: "Piano Inspirational",
    mood: "inspirational",
    url: trackUrl("Piano Inspirational (Inspire Background Music).mp3"),
    description: "Inspiring piano background music with uplifting, hopeful melodies.",
  },
  {
    id: "inspirational-003",
    name: "Inspiring Electronic",
    mood: "inspirational",
    url: trackUrl("Inspiring Electronic.mp3"),
    description: "Electronic track with forward momentum and inspirational build.",
  },
  {
    id: "inspirational-004",
    name: "Fashion Motivation",
    mood: "inspirational",
    url: trackUrl("Fashion Motivation.mp3"),
    description: "Stylish motivational track with modern, confident energy.",
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
  return [
    "epic",
    "calm",
    "mysterious",
    "upbeat",
    "dramatic",
    "romantic",
    "adventure",
    "sad",
    "fantasy",
    "inspirational",
  ];
}

/**
 * Returns a random track for a given mood.
 * Throws if no tracks exist for the mood.
 */
export function getRandomTrackForMood(mood: MusicMood): MusicTrack {
  const tracks = getTracksByMood(mood);
  if (tracks.length === 0) {
    throw new Error(`No tracks available for mood: ${mood}`);
  }
  return tracks[Math.floor(Math.random() * tracks.length)];
}

/**
 * Returns the first (default) track for a given mood.
 * Throws if no tracks exist for the mood.
 */
export function getDefaultTrackForMood(mood: MusicMood): MusicTrack {
  const tracks = getTracksByMood(mood);
  if (tracks.length === 0) {
    throw new Error(`No tracks available for mood: ${mood}`);
  }
  return tracks[0];
}
