import { HttpError } from "wasp/server";
import { prisma } from "wasp/server";
import type {
  GenerateSocialMediaPost,
  GenerateSocialBatchPosts,
} from "wasp/server/operations";
import OpenAI from "openai";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import { deductCredits, refundCredits } from "../../credits/creditService";
import { CreditActionType } from "../../credits/creditConfig";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOpenAIClient(settingEntity: any): Promise<OpenAI> {
  const setting = await settingEntity.findUnique({
    where: { key: "platform.openai_api_key" },
  });
  if (!setting?.value) {
    throw new HttpError(
      400,
      "OpenAI API key not configured. Go to Admin Settings to add your API key."
    );
  }
  return new OpenAI({ apiKey: setting.value });
}

// ---------------------------------------------------------------------------
// Extension guard
// ---------------------------------------------------------------------------

const EXTENSION_ID = "social-media-agent";

async function ensureExtensionActive(
  userExtensionEntity: any,
  userId: string
): Promise<void> {
  const record = await userExtensionEntity.findUnique({
    where: { userId_extensionId: { userId, extensionId: EXTENSION_ID } },
  });
  if (!record?.isActive) {
    throw new HttpError(
      403,
      "Social Media Agent extension is not activated."
    );
  }
}

// ---------------------------------------------------------------------------
// Brand Voice context builder
// ---------------------------------------------------------------------------

function buildBrandVoiceContext(company: any): string {
  if (!company) return "";

  const parts: string[] = [];
  parts.push(`Company: ${company.name}`);
  if (company.industry) parts.push(`Industry: ${company.industry}`);
  if (company.description) parts.push(`About: ${company.description}`);
  if (company.targetAudience)
    parts.push(`Target Audience: ${company.targetAudience}`);
  if (company.toneOfVoice) parts.push(`Brand Tone: ${company.toneOfVoice}`);
  if (company.tagline) parts.push(`Tagline: ${company.tagline}`);
  if (company.specificInstructions)
    parts.push(`Writing Rules: ${company.specificInstructions}`);

  if (company.products?.length > 0) {
    const prodList = company.products
      .map((p: any) => `- ${p.name}: ${p.keyFeatures || "N/A"}`)
      .join("\n");
    parts.push(`Products/Services:\n${prodList}`);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const generateSocialMediaPostSchema = z.object({
  agentId: z.string().uuid(),
  platform: z.string().optional(),
  customPrompt: z.string().optional(),
});

const generateSocialBatchPostsSchema = z.object({
  agentId: z.string().uuid(),
  count: z.number().int().min(1).max(10).default(3),
});

// ---------------------------------------------------------------------------
// Internal: generate a single post for a given platform
// ---------------------------------------------------------------------------

async function generateSinglePost(
  openai: OpenAI,
  agent: any,
  platform: string,
  brandVoiceContext: string,
  customPrompt: string | undefined,
  context: any
): Promise<any> {
  const systemPrompt = [
    "You are an expert social media content creator. Generate a single social media post.",
    "",
    `Platform: ${platform}`,
    `Tone: ${agent.tone || "Professional"}`,
    `Creativity Level: ${agent.creativityLevel}/10`,
    `Hashtag Count: ${agent.hashtagCount}`,
    "",
    agent.brandingDescription
      ? `Branding: ${agent.brandingDescription}`
      : "",
    agent.targetAudience
      ? `Target Audience: ${agent.targetAudience}`
      : "",
    agent.siteUrl ? `Website: ${agent.siteUrl}` : "",
    agent.ctaTemplates?.length
      ? `CTA Templates (use one): ${JSON.stringify(agent.ctaTemplates)}`
      : "",
    agent.categories?.length
      ? `Categories: ${JSON.stringify(agent.categories)}`
      : "",
    agent.goals?.length
      ? `Goals: ${JSON.stringify(agent.goals)}`
      : "",
    brandVoiceContext
      ? `\nBrand Voice:\n${brandVoiceContext}`
      : "",
    "",
    'Return a JSON object with exactly these fields:',
    '{ "content": "the post text without hashtags", "hashtags": "#tag1 #tag2 ..." }',
  ]
    .filter((line) => line !== "")
    .join("\n");

  const userMessage = customPrompt
    ? `Generate a social media post with these additional instructions: ${customPrompt}`
    : `Generate a compelling ${platform} post.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new HttpError(500, "OpenAI returned an empty response.");
  }

  let parsed: { content: string; hashtags: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(500, "Failed to parse AI response as JSON.");
  }

  if (!parsed.content) {
    throw new HttpError(500, "AI response is missing the 'content' field.");
  }

  // Create the post with status "draft"
  const post = await context.entities.SocialMediaAgentPost.create({
    data: {
      agentId: agent.id,
      userId: agent.userId,
      content: parsed.content,
      hashtags: parsed.hashtags || null,
      platform,
      status: "draft",
      aiMetadata: {
        model: "gpt-4o-mini",
        tokensUsed: completion.usage?.total_tokens ?? null,
        promptSnapshot: systemPrompt,
        generatedAt: new Date().toISOString(),
      },
    },
    include: {
      agent: { select: { name: true } },
    },
  });

  // Create initial revision
  await context.entities.PostRevision.create({
    data: {
      postType: "social",
      socialPostId: post.id,
      userId: agent.userId,
      action: "created",
      statusTo: "draft",
      snapshot: {
        content: post.content,
        hashtags: post.hashtags,
        platform: post.platform,
        status: post.status,
        generatedByAI: true,
      },
    },
  });

  return post;
}

// ---------------------------------------------------------------------------
// Operation 1: generateSocialMediaPost
// ---------------------------------------------------------------------------

export const generateSocialMediaPost: GenerateSocialMediaPost<
  z.infer<typeof generateSocialMediaPostSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(
    generateSocialMediaPostSchema,
    rawArgs
  );

  // Fetch agent with company + products for brand voice context
  const agent = await context.entities.SocialMediaAgent.findUnique({
    where: { id: args.agentId },
    include: { company: { include: { products: true } } },
  });

  if (!agent) {
    throw new HttpError(404, "Social media agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized to use this agent");
  }

  // Use platform from args or pick the first from agent.platforms
  const platforms = (agent.platforms as string[]) || [];
  const platform = args.platform || platforms[0] || "facebook";

  // Build brand voice context from company
  const brandVoiceContext = buildBrandVoiceContext(agent.company);

  // Deduct credits before generation
  await deductCredits(prisma, context.user.id, CreditActionType.SocialPost, { agentId: agent.id });

  // Get OpenAI client
  const openai = await getOpenAIClient(context.entities.Setting);

  // Generate the post
  try {
    const post = await generateSinglePost(
      openai,
      agent,
      platform,
      brandVoiceContext,
      args.customPrompt,
      context
    );
    return post;
  } catch (error) {
    await refundCredits(prisma, context.user.id, CreditActionType.SocialPost, "AI generation failed");
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Operation 2: generateSocialBatchPosts
// ---------------------------------------------------------------------------

export const generateSocialBatchPosts: GenerateSocialBatchPosts<
  z.infer<typeof generateSocialBatchPostsSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(
    generateSocialBatchPostsSchema,
    rawArgs
  );

  // Fetch agent with company + products for brand voice context
  const agent = await context.entities.SocialMediaAgent.findUnique({
    where: { id: args.agentId },
    include: { company: { include: { products: true } } },
  });

  if (!agent) {
    throw new HttpError(404, "Social media agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized to use this agent");
  }

  const platforms = (agent.platforms as string[]) || [];
  if (platforms.length === 0) {
    throw new HttpError(
      400,
      "Agent has no platforms configured. Add at least one platform."
    );
  }

  const brandVoiceContext = buildBrandVoiceContext(agent.company);

  // Deduct credits upfront for entire batch
  await deductCredits(prisma, context.user.id, CreditActionType.BatchSocial, { agentId: agent.id }, args.count);

  const openai = await getOpenAIClient(context.entities.Setting);

  const createdPosts: any[] = [];
  const errors: Array<{ index: number; platform: string; error: string }> = [];

  for (let i = 0; i < args.count; i++) {
    // Round-robin across the agent's platforms
    const platform = platforms[i % platforms.length];

    try {
      const post = await generateSinglePost(
        openai,
        agent,
        platform,
        brandVoiceContext,
        undefined, // no custom prompt in batch mode
        context
      );
      createdPosts.push(post);
    } catch (err: any) {
      errors.push({
        index: i,
        platform,
        error: err.message || "Unknown error during generation",
      });
    }
  }

  return {
    posts: createdPosts,
    errors,
    totalRequested: args.count,
    totalCreated: createdPosts.length,
  };
};
