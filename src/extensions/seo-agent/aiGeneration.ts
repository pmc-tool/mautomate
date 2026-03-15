import { HttpError } from "wasp/server";
import { prisma } from "wasp/server";
import type {
  GenerateSeoPost,
  GenerateSeoBatchPosts,
} from "wasp/server/operations";
import OpenAI from "openai";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import { calculateSeoScore, calculateAeoScore } from "./seoScoring";
import { deductCredits, refundCredits } from "../../credits/creditService";
import { CreditActionType } from "../../credits/creditConfig";
import { getSecureSetting } from "../../server/settingEncryption";

// ---------------------------------------------------------------------------
// Extension guard
// ---------------------------------------------------------------------------

const EXTENSION_ID = "seo-agent";

async function ensureExtensionActive(
  userExtensionEntity: any,
  userId: string,
): Promise<void> {
  const record = await userExtensionEntity.findUnique({
    where: {
      userId_extensionId: { userId, extensionId: EXTENSION_ID },
    },
  });
  if (!record?.isActive) {
    throw new HttpError(403, "SEO Agent extension is not activated.");
  }
}

// ---------------------------------------------------------------------------
// OpenAI client helper
// ---------------------------------------------------------------------------

async function getOpenAIClient(settingEntity: any): Promise<OpenAI> {
  const apiKey = await getSecureSetting(settingEntity, "platform.openai_api_key");

  if (!apiKey) {
    throw new HttpError(
      400,
      "OpenAI API key is not configured. Please set it in Admin Settings.",
    );
  }

  return new OpenAI({ apiKey });
}

// ---------------------------------------------------------------------------
// Brand Voice context builder
// ---------------------------------------------------------------------------

function buildBrandVoiceContext(company: any): string {
  if (!company) return "";

  const parts: string[] = [];

  if (company.name) {
    parts.push(`Company: ${company.name}`);
  }
  if (company.industry) {
    parts.push(`Industry: ${company.industry}`);
  }
  if (company.description) {
    parts.push(`Description: ${company.description}`);
  }
  if (company.targetAudience) {
    parts.push(`Target Audience: ${company.targetAudience}`);
  }
  if (company.toneOfVoice) {
    parts.push(`Tone of Voice: ${company.toneOfVoice}`);
  }
  if (company.tagline) {
    parts.push(`Tagline: ${company.tagline}`);
  }
  if (company.specificInstructions) {
    parts.push(`Writing Rules: ${company.specificInstructions}`);
  }

  // Include product information if available
  if (company.products && company.products.length > 0) {
    const productLines = company.products.map((p: any) => {
      const typeLabel = p.type === 1 ? "Service" : p.type === 2 ? "Other" : "Product";
      let line = `- ${p.name} (${typeLabel})`;
      if (p.keyFeatures) {
        line += `: ${p.keyFeatures}`;
      }
      return line;
    });
    parts.push(`Products/Services:\n${productLines.join("\n")}`);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const generateSeoPostSchema = z.object({
  agentId: z.string().uuid("Invalid agent id"),
  keyword: z.string().optional(),
  contentType: z.enum(["internal_blog", "external_blog", "social"]).optional(),
  customPrompt: z.string().optional(),
});

const generateSeoBatchPostsSchema = z.object({
  agentId: z.string().uuid("Invalid agent id"),
  keywordIds: z.array(z.string().uuid()).optional(),
  count: z.number().int().min(1).max(10).default(3),
});

// ---------------------------------------------------------------------------
// Operation 1: generateSeoPost
// ---------------------------------------------------------------------------

export const generateSeoPost: GenerateSeoPost<any, any> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(
    context.entities.UserExtension,
    context.user.id,
  );

  const args = ensureArgsSchemaOrThrowHttpError(generateSeoPostSchema, rawArgs);

  // Fetch agent with company + products
  const agent = await context.entities.SeoAgent.findUnique({
    where: { id: args.agentId },
    include: {
      company: {
        include: { products: true },
      },
    },
  });

  if (!agent) {
    throw new HttpError(404, "SEO Agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this agent");
  }

  // Deduct credits before generation
  await deductCredits(prisma, context.user.id, CreditActionType.SeoArticle, { agentId: agent.id });

  // Get OpenAI client
  const openai = await getOpenAIClient(context.entities.Setting);

  // Build brand voice context
  const brandVoiceContext = buildBrandVoiceContext(agent.company);

  const keyword = args.keyword;
  const contentType = args.contentType || "internal_blog";
  const customPrompt = args.customPrompt;

  // Build system prompt
  const systemPrompt = `You are an expert SEO content writer. Generate a comprehensive, SEO-optimized article.

Target Keyword: ${keyword || "general topic related to " + (agent.niche || "the business")}
Content Type: ${contentType}
Target Word Count: ${agent.targetWordCount}
Tone: ${agent.tone || "Professional"}
Language: ${agent.language || "en"}
${agent.siteUrl ? `Website: ${agent.siteUrl}` : ""}
${agent.niche ? `Niche: ${agent.niche}` : ""}
${brandVoiceContext ? `\nBrand Voice:\n${brandVoiceContext}` : ""}
${customPrompt ? `\nAdditional Instructions: ${customPrompt}` : ""}

Requirements:
- Use the target keyword naturally throughout the content (2-3% density)
- Include the keyword in the title, first paragraph, and at least one subheading
- Write a compelling meta description (150-160 characters) including the keyword
- Generate a URL-friendly slug
- Include an FAQ section with 3-5 questions and answers (structured for FAQ schema)
- Use H2 and H3 subheadings for structure
- Write in HTML format (use <h2>, <h3>, <p>, <ul>, <li>, <strong> tags)

Return a JSON object:
{
  "title": "Article Title",
  "content": "<h2>...</h2><p>...</p>...",
  "metaDescription": "150-160 char description",
  "slug": "url-friendly-slug",
  "faqSchema": [{ "question": "...", "answer": "..." }, ...],
  "secondaryKeywords": ["kw1", "kw2", "kw3"]
}`;

  // Call OpenAI
  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Write a comprehensive SEO article${keyword ? ` about "${keyword}"` : ""}.`,
        },
      ],
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });
  } catch (error) {
    await refundCredits(prisma, context.user.id, CreditActionType.SeoArticle, "AI generation failed");
    throw error;
  }

  const responseText = completion.choices[0]?.message?.content;

  if (!responseText) {
    await refundCredits(prisma, context.user.id, CreditActionType.SeoArticle, "Empty AI response");
    throw new HttpError(500, "OpenAI returned an empty response");
  }

  // Parse JSON response
  let parsed: {
    title: string;
    content: string;
    metaDescription?: string;
    slug?: string;
    faqSchema?: Array<{ question: string; answer: string }>;
    secondaryKeywords?: string[];
  };

  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new HttpError(500, "Failed to parse AI response as JSON");
  }

  if (!parsed.title || !parsed.content) {
    throw new HttpError(500, "AI response is missing required fields (title, content)");
  }

  // Create the SeoAgentPost
  const post = await context.entities.SeoAgentPost.create({
    data: {
      agentId: agent.id,
      userId: context.user.id,
      contentType,
      title: parsed.title,
      content: parsed.content,
      metaDescription: parsed.metaDescription ?? null,
      slug: parsed.slug ?? null,
      primaryKeyword: keyword ?? null,
      secondaryKeywords: parsed.secondaryKeywords ?? [],
      faqSchema: parsed.faqSchema ?? undefined,
      seoScore: calculateSeoScore({
        title: parsed.title,
        content: parsed.content,
        metaDescription: parsed.metaDescription ?? null,
        slug: parsed.slug ?? null,
        primaryKeyword: keyword ?? null,
        secondaryKeywords: parsed.secondaryKeywords ?? [],
      }).total,
      aeoScore: calculateAeoScore({
        content: parsed.content,
        faqSchema: parsed.faqSchema ?? [],
        title: parsed.title,
        metaDescription: parsed.metaDescription ?? null,
      }).total,
      status: "draft",
      aiMetadata: {
        model: "gpt-4o-mini",
        promptTokens: completion.usage?.prompt_tokens ?? null,
        completionTokens: completion.usage?.completion_tokens ?? null,
        totalTokens: completion.usage?.total_tokens ?? null,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  // Create initial revision
  await context.entities.PostRevision.create({
    data: {
      postType: "seo",
      seoPostId: post.id,
      userId: context.user.id,
      action: "created",
      statusTo: "draft",
      snapshot: {
        title: parsed.title,
        content: parsed.content,
        metaDescription: parsed.metaDescription ?? null,
        slug: parsed.slug ?? null,
        primaryKeyword: keyword ?? null,
        secondaryKeywords: parsed.secondaryKeywords ?? [],
        faqSchema: parsed.faqSchema ?? null,
        source: "ai_generated",
      },
    },
  });

  return post;
};

// ---------------------------------------------------------------------------
// Operation 2: generateSeoBatchPosts
// ---------------------------------------------------------------------------

export const generateSeoBatchPosts: GenerateSeoBatchPosts<any, any> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(
    context.entities.UserExtension,
    context.user.id,
  );

  const args = ensureArgsSchemaOrThrowHttpError(
    generateSeoBatchPostsSchema,
    rawArgs,
  );

  // Fetch agent to get seedKeywords
  const agent = await context.entities.SeoAgent.findUnique({
    where: { id: args.agentId },
  });

  if (!agent) {
    throw new HttpError(404, "SEO Agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this agent");
  }

  // Determine keywords to generate articles for
  let keywords: string[] = [];

  if (args.keywordIds && args.keywordIds.length > 0) {
    // Fetch specific keywords from SeoAgentKeyword
    const keywordRecords = await context.entities.SeoAgentKeyword.findMany({
      where: {
        id: { in: args.keywordIds },
        agentId: agent.id,
        userId: context.user.id,
      },
    });

    if (keywordRecords.length === 0) {
      throw new HttpError(
        404,
        "No matching keywords found for this agent.",
      );
    }

    keywords = keywordRecords.map((k: any) => k.keyword);
  } else {
    // Use agent's seedKeywords
    const seedKeywords: string[] = Array.isArray(agent.seedKeywords)
      ? (agent.seedKeywords as string[])
      : [];

    if (seedKeywords.length === 0) {
      throw new HttpError(
        400,
        "No keywords available. Add seed keywords to the agent or provide specific keyword IDs.",
      );
    }

    keywords = seedKeywords.slice(0, args.count);
  }

  // Generate one article per keyword, skipping failures
  const results: any[] = [];

  for (const keyword of keywords) {
    try {
      const post = await generateSeoPost(
        {
          agentId: args.agentId,
          keyword,
        },
        context,
      );
      results.push(post);
    } catch (error: any) {
      // Log but skip failures -- continue with remaining keywords
      console.error(
        `[SEO Batch] Failed to generate article for keyword "${keyword}":`,
        error?.message || error,
      );
    }
  }

  return results;
};
