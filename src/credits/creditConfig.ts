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
  StoryBasic = "story_basic",
  StoryStandard = "story_standard",
  StorySceneRegen = "story_scene_regen",
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
  [CreditActionType.StoryBasic]: 150,
  [CreditActionType.StoryStandard]: 300,
  [CreditActionType.StorySceneRegen]: 30,
};

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
  [CreditActionType.StoryBasic]: "Story video (~1 min)",
  [CreditActionType.StoryStandard]: "Story video (~2 min)",
  [CreditActionType.StorySceneRegen]: "Story scene regeneration",
};
