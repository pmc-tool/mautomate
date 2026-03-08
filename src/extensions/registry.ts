export interface ExtensionDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "ai" | "marketing" | "productivity";
  route: string;
  settingsKeys: string[];
  isFree: boolean;
  defaultPrice: number;
  isEnabled: boolean;
}

export const EXTENSION_REGISTRY: ExtensionDefinition[] = [
  {
    id: "ai-image-generator",
    name: "AI Image Generator",
    description: "Generate images from text prompts using Novita AI.",
    icon: "ImagePlus",
    category: "ai",
    route: "/extensions/ai-image-generator",
    settingsKeys: ["ext.ai-image-generator.novita_api_key", "ext.ai-image-generator.price", "ext.ai-image-generator.stripe_price_id"],
    isFree: false,
    defaultPrice: 5,
    isEnabled: true,
  },
  {
    id: "social-media-agent",
    name: "Social Media Agent",
    description: "AI-powered social media content creation, scheduling, and auto-publishing across all platforms.",
    icon: "Share2",
    category: "marketing",
    route: "/extensions/social-media-agent",
    settingsKeys: ["ext.social-media-agent.price", "ext.social-media-agent.stripe_price_id"],
    isFree: false,
    defaultPrice: 10,
    isEnabled: true,
  },
  {
    id: "seo-agent",
    name: "SEO Agent",
    description: "AI-driven SEO content generation with keyword research, scoring, and WordPress publishing.",
    icon: "Search",
    category: "marketing",
    route: "/extensions/seo-agent",
    settingsKeys: ["ext.seo-agent.price", "ext.seo-agent.stripe_price_id", "platform.spyfu_api_key"],
    isFree: false,
    defaultPrice: 15,
    isEnabled: true,
  },
  {
    id: "video-studio",
    name: "Video Studio",
    description: "AI video generation — text-to-video, image-to-video, AI avatars, and upscaling powered by fal.ai.",
    icon: "Video",
    category: "ai",
    route: "/video-studio",
    settingsKeys: ["ext.video-studio.fal_api_key", "ext.video-studio.price", "ext.video-studio.stripe_price_id"],
    isFree: false,
    defaultPrice: 15,
    isEnabled: true,
  },
  {
    id: "long-story-video",
    name: "Long Story Video",
    description: "Create 1-2 minute narrated story videos from a single prompt — AI scenes, voice, music & subtitles.",
    icon: "Film",
    category: "ai",
    route: "/long-story",
    settingsKeys: [
      "ext.long-story-video.novita_api_key",
      "ext.long-story-video.price",
      "ext.long-story-video.stripe_price_id",
    ],
    isFree: false,
    defaultPrice: 20,
    isEnabled: true,
  },
  {
    id: "central-inbox",
    name: "Central Inbox",
    description: "Unified inbox for AI + human agent conversations across website, WhatsApp, Telegram, Messenger, and Instagram.",
    icon: "Inbox",
    category: "marketing",
    route: "/inbox",
    settingsKeys: ["ext.central-inbox.price", "ext.central-inbox.stripe_price_id"],
    isFree: false,
    defaultPrice: 20,
    isEnabled: true,
  },
];

export function getExtensionById(id: string): ExtensionDefinition | undefined {
  return EXTENSION_REGISTRY.find((ext) => ext.id === id);
}

export function getEnabledExtensions(): ExtensionDefinition[] {
  return EXTENSION_REGISTRY.filter((ext) => ext.isEnabled);
}
