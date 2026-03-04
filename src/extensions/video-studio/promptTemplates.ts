// ---------------------------------------------------------------------------
// Video Studio — Prompt Templates
// Pre-built templates by category to help users get started quickly.
// ---------------------------------------------------------------------------

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  prompt: string;
  negativePrompt?: string;
  suggestedType: "ttv" | "itv";
  suggestedDuration: number;
  suggestedAspectRatio: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // ---- News Anchor ----
  {
    id: "news-anchor-studio",
    name: "News Anchor — Studio",
    category: "news",
    prompt:
      "A professional news anchor sitting at a modern broadcast desk in a sleek news studio with large screens behind them. The anchor speaks directly to camera with confident body language, studio lighting illuminates the scene. Breaking news ticker scrolls at the bottom. Cinematic, broadcast quality.",
    negativePrompt: "blurry, low quality, amateur, shaky",
    suggestedType: "ttv",
    suggestedDuration: 5,
    suggestedAspectRatio: "16:9",
  },
  {
    id: "news-field-report",
    name: "News — Field Report",
    category: "news",
    prompt:
      "A news reporter standing outdoors in a busy city street delivering a live field report. They hold a microphone with a professional demeanor. The background shows urban activity with natural lighting. Broadcast quality, steady camera.",
    suggestedType: "ttv",
    suggestedDuration: 5,
    suggestedAspectRatio: "16:9",
  },

  // ---- Product Showcase ----
  {
    id: "product-reveal",
    name: "Product — Cinematic Reveal",
    category: "product",
    prompt:
      "A premium product slowly rotating on a sleek pedestal against a dark background with dramatic studio lighting. Soft reflections and particle effects create an elegant atmosphere. The camera smoothly orbits around the product. Cinematic, high-end commercial style.",
    negativePrompt: "cluttered, messy background, low quality",
    suggestedType: "itv",
    suggestedDuration: 5,
    suggestedAspectRatio: "16:9",
  },
  {
    id: "product-lifestyle",
    name: "Product — Lifestyle",
    category: "product",
    prompt:
      "A lifestyle shot showing a product being used naturally in a beautiful, well-lit environment. The camera gently pans to reveal the product in context. Warm, inviting lighting with shallow depth of field. Premium advertising quality.",
    suggestedType: "itv",
    suggestedDuration: 5,
    suggestedAspectRatio: "16:9",
  },

  // ---- Social Short ----
  {
    id: "social-hook",
    name: "Social — Attention Hook",
    category: "social",
    prompt:
      "A dynamic, fast-paced vertical video with bold text overlays and quick transitions. Bright colors, energetic movement, and eye-catching visuals designed to stop the scroll. Modern social media aesthetic with trendy transitions.",
    suggestedType: "ttv",
    suggestedDuration: 5,
    suggestedAspectRatio: "9:16",
  },
  {
    id: "social-trending",
    name: "Social — Trending Style",
    category: "social",
    prompt:
      "A trendy vertical video with smooth camera movements, aesthetic color grading, and a modern visual style. Clean transitions, soft lighting, and a contemporary feel perfect for Instagram Reels or TikTok.",
    suggestedType: "ttv",
    suggestedDuration: 5,
    suggestedAspectRatio: "9:16",
  },

  // ---- Influencer ----
  {
    id: "influencer-talking",
    name: "Influencer — Talking Head",
    category: "influencer",
    prompt:
      "A content creator speaking directly to camera in a well-decorated, naturally lit room. Casual but polished appearance, genuine expressions, and engaging body language. Modern influencer aesthetic with soft bokeh background.",
    suggestedType: "ttv",
    suggestedDuration: 5,
    suggestedAspectRatio: "9:16",
  },
  {
    id: "influencer-outdoor",
    name: "Influencer — Outdoor Vlog",
    category: "influencer",
    prompt:
      "An influencer walking through a scenic outdoor location, speaking to camera with natural hand gestures. Beautiful golden hour lighting, slight camera movement for authenticity. Vlog-style with cinematic color grading.",
    suggestedType: "ttv",
    suggestedDuration: 5,
    suggestedAspectRatio: "9:16",
  },

  // ---- Explainer ----
  {
    id: "explainer-motion",
    name: "Explainer — Motion Graphics",
    category: "explainer",
    prompt:
      "Professional motion graphics animation with clean geometric shapes, smooth transitions, and modern typography. Infographic-style data visualization with a corporate color palette. Clean, minimalist design with fluid animations.",
    negativePrompt: "realistic, photographic, cluttered",
    suggestedType: "ttv",
    suggestedDuration: 5,
    suggestedAspectRatio: "16:9",
  },
  {
    id: "explainer-whiteboard",
    name: "Explainer — Whiteboard",
    category: "explainer",
    prompt:
      "A whiteboard animation style video where illustrations are drawn in real-time. Clean line art appears progressively on a white background, with hand-drawn diagrams and text being sketched out. Educational and clear.",
    suggestedType: "ttv",
    suggestedDuration: 5,
    suggestedAspectRatio: "16:9",
  },

  // ---- Custom ----
  {
    id: "custom-blank",
    name: "Custom — Start from Scratch",
    category: "custom",
    prompt: "",
    suggestedType: "ttv",
    suggestedDuration: 5,
    suggestedAspectRatio: "16:9",
  },
];

export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter((t) => t.category === category);
}

export const TEMPLATE_CATEGORIES = [
  { id: "custom", label: "Custom" },
  { id: "news", label: "News Anchor" },
  { id: "product", label: "Product Showcase" },
  { id: "social", label: "Social Short" },
  { id: "influencer", label: "Influencer" },
  { id: "explainer", label: "Explainer" },
];
