// ---------------------------------------------------------------------------
// Credit Action Types — every AI action that costs credits
// ---------------------------------------------------------------------------

export enum CreditActionType {
  SocialPost = "social_post",
  SeoArticle = "seo_article",
  BatchSocial = "batch_social",
  AiImage = "ai_image",
  ChatbotMessage = "chatbot_message",
  KeywordResearch = "keyword_research",
  ContentBrief = "content_brief",
  KeywordClustering = "keyword_clustering",
  ReworkSocial = "rework_social",
  ReworkSeo = "rework_seo",
  ArticleFromBrief = "article_from_brief",
  InboxAiReply = "inbox_ai_reply",
  VideoBasic = "video_basic",
  VideoStandard = "video_standard",
  VideoPremium = "video_premium",
  StoryPlan = "story_plan",
  StoryLow = "story_low",
  StoryLowLong = "story_low_long",
  StoryMedium = "story_medium",
  StoryMediumLong = "story_medium_long",
  StoryHigh = "story_high",
  StoryHighLong = "story_high_long",
  StorySceneRegen = "story_scene_regen",
  PromptEnhance = "prompt_enhance",
}

// ---------------------------------------------------------------------------
// Credit costs per action
// ---------------------------------------------------------------------------

export const CREDIT_COSTS: Record<CreditActionType, number> = {
  [CreditActionType.SocialPost]: 5,
  [CreditActionType.SeoArticle]: 40,
  [CreditActionType.BatchSocial]: 4, // per post in batch
  [CreditActionType.AiImage]: 20,
  [CreditActionType.ChatbotMessage]: 2,
  [CreditActionType.KeywordResearch]: 10,
  [CreditActionType.ContentBrief]: 15,
  [CreditActionType.KeywordClustering]: 10,
  [CreditActionType.ReworkSocial]: 5,
  [CreditActionType.ReworkSeo]: 40,
  [CreditActionType.ArticleFromBrief]: 40,
  [CreditActionType.InboxAiReply]: 2,
  [CreditActionType.VideoBasic]: 15,
  [CreditActionType.VideoStandard]: 30,
  [CreditActionType.VideoPremium]: 60,
  [CreditActionType.StoryPlan]: 10,
  [CreditActionType.StoryLow]: 150,
  [CreditActionType.StoryLowLong]: 300,
  [CreditActionType.StoryMedium]: 300,
  [CreditActionType.StoryMediumLong]: 600,
  [CreditActionType.StoryHigh]: 450,
  [CreditActionType.StoryHighLong]: 900,
  [CreditActionType.StorySceneRegen]: 30,
  [CreditActionType.PromptEnhance]: 2,
};

// ---------------------------------------------------------------------------
// Video quality tiers for Long Story Video
// ---------------------------------------------------------------------------

export type StoryQuality = "low" | "medium" | "high";

export interface QualityTier {
  id: StoryQuality;
  label: string;
  model: string;
  resolution: "720p" | "1080p";
  description: string;
}

export const QUALITY_TIERS: QualityTier[] = [
  { id: "low", label: "Standard", model: "wan2.1", resolution: "720p", description: "720p HD · Fast rendering" },
  { id: "medium", label: "Pro", model: "wan2.6", resolution: "720p", description: "720p HD · Premium AI model" },
  { id: "high", label: "Ultra", model: "wan2.6", resolution: "1080p", description: "1080p Full HD · Best quality" },
];

export function getQualityTier(quality: StoryQuality): QualityTier {
  return QUALITY_TIERS.find((t) => t.id === quality) || QUALITY_TIERS[0];
}

export function getStoryCreditAction(quality: StoryQuality, sceneCount: number): CreditActionType {
  const isLong = sceneCount > 8;
  switch (quality) {
    case "high":
      return isLong ? CreditActionType.StoryHighLong : CreditActionType.StoryHigh;
    case "medium":
      return isLong ? CreditActionType.StoryMediumLong : CreditActionType.StoryMedium;
    default:
      return isLong ? CreditActionType.StoryLowLong : CreditActionType.StoryLow;
  }
}

// ---------------------------------------------------------------------------
// Plan credit allotments (monthly reset)
// ---------------------------------------------------------------------------

export const PLAN_CREDIT_ALLOTMENTS: Record<string, number> = {
  starter: 3_000,
  growth: 8_000,
  pro: 20_000,
  agency: 50_000,
};

// ---------------------------------------------------------------------------
// Trial credits for new signups
// ---------------------------------------------------------------------------

export const TRIAL_CREDITS = 100;

// ---------------------------------------------------------------------------
// Top-up packs
// ---------------------------------------------------------------------------

export interface TopUpPack {
  id: string;
  credits: number;
  price: number; // dollars
  label: string;
}

export const TOP_UP_PACKS: TopUpPack[] = [
  { id: "topup_500", credits: 500, price: 9, label: "500 credits" },
  { id: "topup_2000", credits: 2_000, price: 29, label: "2,000 credits" },
  { id: "topup_5000", credits: 5_000, price: 59, label: "5,000 credits" },
];

// ---------------------------------------------------------------------------
// Human-readable labels
// ---------------------------------------------------------------------------

export const ACTION_LABELS: Record<CreditActionType, string> = {
  [CreditActionType.SocialPost]: "Social post generation",
  [CreditActionType.SeoArticle]: "SEO article generation",
  [CreditActionType.BatchSocial]: "Batch social post",
  [CreditActionType.AiImage]: "AI image generation",
  [CreditActionType.ChatbotMessage]: "Chatbot message",
  [CreditActionType.KeywordResearch]: "Keyword research",
  [CreditActionType.ContentBrief]: "Content brief",
  [CreditActionType.KeywordClustering]: "Keyword clustering",
  [CreditActionType.ReworkSocial]: "Social post rework",
  [CreditActionType.ReworkSeo]: "SEO article rework",
  [CreditActionType.ArticleFromBrief]: "Article from brief",
  [CreditActionType.InboxAiReply]: "Inbox AI reply",
  [CreditActionType.VideoBasic]: "Video generation (budget)",
  [CreditActionType.VideoStandard]: "Video generation (standard)",
  [CreditActionType.VideoPremium]: "Video generation (premium)",
  [CreditActionType.StoryPlan]: "Story video planning",
  [CreditActionType.StoryLow]: "Story video (Standard ≤1min)",
  [CreditActionType.StoryLowLong]: "Story video (Standard >1min)",
  [CreditActionType.StoryMedium]: "Story video (Pro ≤1min)",
  [CreditActionType.StoryMediumLong]: "Story video (Pro >1min)",
  [CreditActionType.StoryHigh]: "Story video (Ultra ≤1min)",
  [CreditActionType.StoryHighLong]: "Story video (Ultra >1min)",
  [CreditActionType.StorySceneRegen]: "Story scene regeneration",
  [CreditActionType.PromptEnhance]: "AI prompt enhancement",
};
