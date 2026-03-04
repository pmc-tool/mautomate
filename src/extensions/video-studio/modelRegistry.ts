// ---------------------------------------------------------------------------
// Video Studio — Model Registry
// All fal.ai model definitions. Add new models by adding entries here.
// ---------------------------------------------------------------------------

export interface AvatarOption {
  id: string;
  name: string;
  previewUrl: string;
  gender: "male" | "female";
  style: string;
}

export interface VideoModel {
  key: string;
  name: string;
  endpoint: string; // fal.ai endpoint ID
  type: "ttv" | "itv" | "upscale" | "avatar";
  durations: number[];
  aspectRatios: string[];
  resolutions: string[];
  creditCost: number; // base credits per generation
  tier: "budget" | "standard" | "premium";
  description: string;
  thumbnail?: string;
  supportsAudio?: boolean;
  supportsEnhancePrompt?: boolean;
  supportsCfgScale?: boolean;
  supportsNegativePrompt?: boolean;
  supportsFirstLastFrame?: boolean;
  supportsReferenceImages?: boolean;
  avatarOptions?: AvatarOption[];
}

export const VIDEO_MODELS: VideoModel[] = [
  // ---- Text-to-Video ----
  {
    key: "veo3",
    name: "Veo 3",
    endpoint: "fal-ai/veo3/text-to-video",
    type: "ttv",
    durations: [5, 8],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 60,
    tier: "premium",
    description: "Google's top-tier model with audio generation and prompt enhancement.",
    supportsAudio: true,
    supportsEnhancePrompt: true,
    supportsNegativePrompt: true,
  },
  {
    key: "veo3-fast",
    name: "Veo 3 Fast",
    endpoint: "fal-ai/veo3/text-to-video/fast",
    type: "ttv",
    durations: [5, 8],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 30,
    tier: "standard",
    description: "Faster Veo 3 variant trading some quality for speed.",
    supportsAudio: true,
    supportsEnhancePrompt: true,
    supportsNegativePrompt: true,
  },
  {
    key: "veo31-ttv",
    name: "Veo 3.1",
    endpoint: "fal-ai/veo3.1/text-to-video",
    type: "ttv",
    durations: [5, 8],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 60,
    tier: "premium",
    description: "Latest Google model with improved motion and detail.",
    supportsEnhancePrompt: true,
    supportsNegativePrompt: true,
  },
  {
    key: "veo31-ttv-fast",
    name: "Veo 3.1 Fast",
    endpoint: "fal-ai/veo3.1/text-to-video/fast",
    type: "ttv",
    durations: [5, 8],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 30,
    tier: "standard",
    description: "Fast variant of Veo 3.1 for quicker turnaround.",
    supportsEnhancePrompt: true,
    supportsNegativePrompt: true,
  },
  {
    key: "wan25",
    name: "Wan 2.5",
    endpoint: "fal-ai/wan/v2.5/text-to-video",
    type: "ttv",
    durations: [3, 5],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["480p", "720p"],
    creditCost: 15,
    tier: "budget",
    description: "Cost-effective text-to-video with good results.",
    supportsNegativePrompt: true,
    supportsCfgScale: true,
  },
  {
    key: "minimax-hailuo",
    name: "Minimax Hailuo",
    endpoint: "fal-ai/minimax-video/video-01",
    type: "ttv",
    durations: [5],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 30,
    tier: "standard",
    description: "High-quality video generation from Minimax.",
    supportsNegativePrompt: true,
  },
  {
    key: "seedance-pro",
    name: "Seedance 1 Pro",
    endpoint: "fal-ai/seedance/video/text-to-video",
    type: "ttv",
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 30,
    tier: "standard",
    description: "Professional text-to-video with smooth motion.",
    supportsNegativePrompt: true,
  },
  {
    key: "hunyuan",
    name: "Hunyuan",
    endpoint: "fal-ai/hunyuan-video",
    type: "ttv",
    durations: [3, 5],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 15,
    tier: "budget",
    description: "Tencent's budget-friendly video generation model.",
    supportsNegativePrompt: true,
    supportsCfgScale: true,
  },

  // ---- Image-to-Video ----
  {
    key: "kling25-turbo",
    name: "Kling 2.5 Turbo Pro",
    endpoint: "fal-ai/kling-video/v2.5/turbo/image-to-video",
    type: "itv",
    durations: [5],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 30,
    tier: "standard",
    description: "Fast image-to-video with Kling's turbo model.",
    supportsNegativePrompt: true,
    supportsCfgScale: true,
  },
  {
    key: "kling25-pro",
    name: "Kling 2.5 Pro",
    endpoint: "fal-ai/kling-video/v2.5/pro/image-to-video",
    type: "itv",
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 30,
    tier: "standard",
    description: "Standard Kling image-to-video with great quality.",
    supportsNegativePrompt: true,
    supportsCfgScale: true,
  },
  {
    key: "veo31-itv",
    name: "Veo 3.1 ITV",
    endpoint: "fal-ai/veo3.1/image-to-video",
    type: "itv",
    durations: [5, 8],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 60,
    tier: "premium",
    description: "Google's latest image-to-video with exceptional fidelity.",
    supportsEnhancePrompt: true,
  },
  {
    key: "veo31-first-last",
    name: "Veo 3.1 First-Last Frame",
    endpoint: "fal-ai/veo3.1/first-last-frame-to-video",
    type: "itv",
    durations: [5, 8],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 60,
    tier: "premium",
    description: "Generate video from first and last frame images.",
    supportsFirstLastFrame: true,
    supportsEnhancePrompt: true,
  },
  {
    key: "veo31-reference",
    name: "Veo 3.1 Reference",
    endpoint: "fal-ai/veo3.1/reference-to-video",
    type: "itv",
    durations: [5, 8],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 60,
    tier: "premium",
    description: "Generate video using reference images for style guidance.",
    supportsReferenceImages: true,
    supportsEnhancePrompt: true,
  },
  {
    key: "seedance-itv",
    name: "Seedance 1 Pro ITV",
    endpoint: "fal-ai/seedance/video/image-to-video",
    type: "itv",
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 30,
    tier: "standard",
    description: "Animate still images into smooth video.",
    supportsNegativePrompt: true,
  },
  {
    key: "luma-dream",
    name: "Luma Dream Machine",
    endpoint: "fal-ai/luma-dream-machine",
    type: "itv",
    durations: [5],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 30,
    tier: "standard",
    description: "Luma's Dream Machine for creative image animation.",
  },
  {
    key: "wan25-itv",
    name: "Wan 2.5 ITV",
    endpoint: "fal-ai/wan/v2.5/image-to-video",
    type: "itv",
    durations: [3, 5],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["480p", "720p"],
    creditCost: 15,
    tier: "budget",
    description: "Cost-effective image-to-video from Wan.",
    supportsNegativePrompt: true,
    supportsCfgScale: true,
  },
  {
    key: "hunyuan-itv",
    name: "Hunyuan ITV",
    endpoint: "fal-ai/hunyuan-video/image-to-video",
    type: "itv",
    durations: [3, 5],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    creditCost: 15,
    tier: "budget",
    description: "Tencent's budget image-to-video model.",
    supportsNegativePrompt: true,
  },
  {
    key: "kling3-pro",
    name: "Kling 3 Pro",
    endpoint: "fal-ai/kling-video/v3/pro/image-to-video",
    type: "itv",
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p", "1080p"],
    creditCost: 60,
    tier: "premium",
    description: "Kling's premium image-to-video with top-tier quality.",
    supportsNegativePrompt: true,
    supportsCfgScale: true,
  },

  // ---- Avatar ----
  {
    key: "veed-avatar",
    name: "VEED AI Avatar",
    endpoint: "veed/avatars/text-to-video",
    type: "avatar",
    durations: [5, 10, 15],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: ["720p", "1080p"],
    creditCost: 60,
    tier: "premium",
    description: "Generate AI avatar videos with realistic talking-head presenters.",
    avatarOptions: [
      {
        id: "emily",
        name: "Emily",
        previewUrl: "",
        gender: "female",
        style: "Professional & Friendly",
      },
      {
        id: "marcus",
        name: "Marcus",
        previewUrl: "",
        gender: "male",
        style: "Authoritative & Warm",
      },
      {
        id: "aisha",
        name: "Aisha",
        previewUrl: "",
        gender: "female",
        style: "Dynamic & Energetic",
      },
      {
        id: "elena",
        name: "Elena",
        previewUrl: "",
        gender: "female",
        style: "Calm & Sophisticated",
      },
    ],
  },

  // ---- Upscale ----
  {
    key: "video-upscaler",
    name: "Video Upscaler",
    endpoint: "fal-ai/video-upscaler",
    type: "upscale",
    durations: [],
    aspectRatios: [],
    resolutions: ["1080p", "4k"],
    creditCost: 15,
    tier: "budget",
    description: "Upscale any video to higher resolution.",
  },
];

export function getModelByKey(key: string): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.key === key);
}

export function getModelsByType(
  type: "ttv" | "itv" | "upscale" | "avatar",
): VideoModel[] {
  return VIDEO_MODELS.filter((m) => m.type === type);
}
