import { HttpError } from "wasp/server";
import { prisma } from "wasp/server";
import type {
  GenerateContentBrief,
  GenerateArticleFromBrief,
  GetContentBriefs,
} from "wasp/server/operations";
import OpenAI from "openai";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import { deductCredits, refundCredits } from "../../credits/creditService";
import { CreditActionType } from "../../credits/creditConfig";

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
  const apiKeySetting = await settingEntity.findUnique({
    where: { key: "platform.openai_api_key" },
  });

  if (!apiKeySetting?.value) {
    throw new HttpError(
      400,
      "OpenAI API key is not configured. Please set it in Admin Settings.",
    );
  }

  return new OpenAI({ apiKey: apiKeySetting.value });
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const generateContentBriefSchema = z.object({
  agentId: z.string().uuid("Invalid agent id"),
  clusterId: z.string().uuid("Invalid cluster id").optional(),
});

const generateArticleFromBriefSchema = z.object({
  briefId: z.string().uuid("Invalid brief id"),
});

const getContentBriefsSchema = z.object({
  agentId: z.string().uuid("Invalid agent id"),
});

// ---------------------------------------------------------------------------
// Action: generateContentBrief
// ---------------------------------------------------------------------------

export const generateContentBrief: GenerateContentBrief<any, any> = async (
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
    generateContentBriefSchema,
    rawArgs,
  );

  // Fetch agent and verify ownership
  const agent = await context.entities.SeoAgent.findUnique({
    where: { id: args.agentId },
  });

  if (!agent) {
    throw new HttpError(404, "SEO Agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this agent");
  }

  // Determine keywords: from cluster or agent seedKeywords
  let keywords: string[] = [];
  let clusterId: string | null = null;

  if (args.clusterId) {
    const cluster = await context.entities.SeoAgentCluster.findUnique({
      where: { id: args.clusterId },
    });

    if (!cluster) {
      throw new HttpError(404, "Cluster not found");
    }

    if (cluster.userId !== context.user.id) {
      throw new HttpError(403, "You do not own this cluster");
    }

    keywords = Array.isArray(cluster.keywords)
      ? (cluster.keywords as string[])
      : [];
    clusterId = cluster.id;
  } else {
    keywords = Array.isArray(agent.seedKeywords)
      ? (agent.seedKeywords as string[])
      : [];
  }

  if (keywords.length === 0) {
    throw new HttpError(
      400,
      "No keywords available. Add seed keywords to the agent or select a cluster with keywords.",
    );
  }

  // Deduct credits
  await deductCredits(prisma, context.user.id, CreditActionType.ContentBrief, { agentId: agent.id });

  // Get OpenAI client
  const openai = await getOpenAIClient(context.entities.Setting);

  // Build the prompt
  const systemPrompt = `You are an SEO content strategist. Generate a detailed content brief for a comprehensive article.

Keywords: ${keywords.join(", ")}
${agent.niche ? `Niche: ${agent.niche}` : ""}
Target Word Count: ${agent.targetWordCount}

Create a thorough content brief that will guide a writer to produce an SEO-optimized article.

Return a JSON object with this exact structure:
{
  "outline": [
    {
      "heading": "H2 heading text",
      "subheadings": ["H3 subheading 1", "H3 subheading 2"],
      "keyPoints": ["Key point to cover", "Another key point"]
    }
  ],
  "targetKeywords": ["primary keyword", "secondary keyword 1", "secondary keyword 2"],
  "questionsToAnswer": ["Question 1?", "Question 2?", "Question 3?"],
  "targetWordCount": ${agent.targetWordCount},
  "linksToInclude": [
    {
      "url": "https://example.com/relevant-page",
      "anchorText": "descriptive anchor text",
      "reason": "Why this link adds value"
    }
  ]
}`;

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate a content brief for an article targeting these keywords: ${keywords.join(", ")}`,
        },
      ],
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });
  } catch (error) {
    await refundCredits(prisma, context.user.id, CreditActionType.ContentBrief, "AI generation failed");
    throw error;
  }

  const responseText = completion.choices[0]?.message?.content;

  if (!responseText) {
    throw new HttpError(500, "OpenAI returned an empty response");
  }

  let parsed: {
    outline: Array<{
      heading: string;
      subheadings: string[];
      keyPoints: string[];
    }>;
    targetKeywords: string[];
    questionsToAnswer: string[];
    targetWordCount: number;
    linksToInclude: Array<{
      url: string;
      anchorText: string;
      reason: string;
    }>;
  };

  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new HttpError(500, "Failed to parse AI response as JSON");
  }

  if (!parsed.outline || !Array.isArray(parsed.outline)) {
    throw new HttpError(500, "AI response is missing required field (outline)");
  }

  // Create SeoAgentContentBrief record
  const brief = await context.entities.SeoAgentContentBrief.create({
    data: {
      agentId: agent.id,
      userId: context.user.id,
      clusterId: clusterId,
      outline: parsed.outline,
      targetKeywords: parsed.targetKeywords ?? [],
      questionsToAnswer: parsed.questionsToAnswer ?? [],
      targetWordCount: parsed.targetWordCount ?? agent.targetWordCount,
      linksToInclude: parsed.linksToInclude ?? [],
    },
  });

  return brief;
};

// ---------------------------------------------------------------------------
// Action: generateArticleFromBrief
// ---------------------------------------------------------------------------

export const generateArticleFromBrief: GenerateArticleFromBrief<
  any,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(
    context.entities.UserExtension,
    context.user.id,
  );

  const args = ensureArgsSchemaOrThrowHttpError(
    generateArticleFromBriefSchema,
    rawArgs,
  );

  // Fetch brief with agent and cluster
  const brief = await context.entities.SeoAgentContentBrief.findUnique({
    where: { id: args.briefId },
    include: {
      agent: true,
      cluster: true,
    },
  });

  if (!brief) {
    throw new HttpError(404, "Content brief not found");
  }

  if (brief.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this brief");
  }

  // Fetch agent with company + products for brand voice
  const agent = await context.entities.SeoAgent.findUnique({
    where: { id: brief.agentId },
    include: {
      company: {
        include: { products: true },
      },
    },
  });

  if (!agent) {
    throw new HttpError(404, "SEO Agent not found");
  }

  // Build brand voice context
  let brandVoiceContext = "";
  if (agent.company) {
    const parts: string[] = [];
    if (agent.company.name) parts.push(`Company: ${agent.company.name}`);
    if (agent.company.industry)
      parts.push(`Industry: ${agent.company.industry}`);
    if (agent.company.description)
      parts.push(`Description: ${agent.company.description}`);
    if (agent.company.targetAudience)
      parts.push(`Target Audience: ${agent.company.targetAudience}`);
    if (agent.company.toneOfVoice)
      parts.push(`Tone of Voice: ${agent.company.toneOfVoice}`);
    if (agent.company.tagline)
      parts.push(`Tagline: ${agent.company.tagline}`);
    if (agent.company.specificInstructions)
      parts.push(`Writing Rules: ${agent.company.specificInstructions}`);

    if (agent.company.products && agent.company.products.length > 0) {
      const productLines = agent.company.products.map((p: any) => {
        const typeLabel =
          p.type === 1 ? "Service" : p.type === 2 ? "Other" : "Product";
        let line = `- ${p.name} (${typeLabel})`;
        if (p.keyFeatures) {
          line += `: ${p.keyFeatures}`;
        }
        return line;
      });
      parts.push(`Products/Services:\n${productLines.join("\n")}`);
    }

    brandVoiceContext = parts.join("\n");
  }

  // Build the outline string
  const outline = Array.isArray(brief.outline)
    ? (brief.outline as Array<{
        heading: string;
        subheadings: string[];
        keyPoints: string[];
      }>)
    : [];
  const outlineStr = outline
    .map((section, i) => {
      let s = `${i + 1}. ${section.heading}`;
      if (section.subheadings?.length) {
        s += "\n" + section.subheadings.map((sh) => `   - ${sh}`).join("\n");
      }
      if (section.keyPoints?.length) {
        s +=
          "\n   Key points: " + section.keyPoints.map((kp) => kp).join("; ");
      }
      return s;
    })
    .join("\n");

  const targetKeywords = Array.isArray(brief.targetKeywords)
    ? (brief.targetKeywords as string[])
    : [];
  const questionsToAnswer = Array.isArray(brief.questionsToAnswer)
    ? (brief.questionsToAnswer as string[])
    : [];
  const linksToInclude = Array.isArray(brief.linksToInclude)
    ? (brief.linksToInclude as Array<{
        url: string;
        anchorText: string;
        reason: string;
      }>)
    : [];

  // Build system prompt
  const systemPrompt = `Write a complete SEO article following this content brief exactly.

Outline:
${outlineStr}

Target Keywords: ${targetKeywords.join(", ")}
Target Word Count: ${brief.targetWordCount}
Tone: ${agent.tone || "Professional"}
Language: ${agent.language || "en"}
${agent.niche ? `Niche: ${agent.niche}` : ""}

Questions to Answer:
${questionsToAnswer.map((q) => `- ${q}`).join("\n")}

Links to Include:
${linksToInclude.map((l) => `- ${l.anchorText}: ${l.url} (${l.reason})`).join("\n")}

${brandVoiceContext ? `Brand Voice:\n${brandVoiceContext}` : ""}

Requirements:
- Follow the outline structure exactly, using the headings and subheadings provided
- Naturally incorporate all target keywords (2-3% density)
- Answer all the specified questions within the article
- Include the suggested links with their anchor text
- Write a compelling meta description (150-160 characters) including the primary keyword
- Generate a URL-friendly slug
- Include an FAQ section based on the questions to answer
- Write in HTML format (use <h2>, <h3>, <p>, <ul>, <li>, <strong> tags)

Return a JSON object:
{
  "title": "Article Title",
  "content": "<h2>...</h2><p>...</p>...",
  "metaDescription": "150-160 char description",
  "slug": "url-friendly-slug",
  "faqSchema": [{ "question": "...", "answer": "..." }],
  "secondaryKeywords": ["kw1", "kw2", "kw3"]
}`;

  // Deduct credits
  await deductCredits(prisma, context.user.id, CreditActionType.ArticleFromBrief, { briefId: brief.id });

  // Get OpenAI client
  const openai = await getOpenAIClient(context.entities.Setting);

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Write the complete article following the content brief.",
        },
      ],
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });
  } catch (error) {
    await refundCredits(prisma, context.user.id, CreditActionType.ArticleFromBrief, "AI generation failed");
    throw error;
  }

  const responseText = completion.choices[0]?.message?.content;

  if (!responseText) {
    await refundCredits(prisma, context.user.id, CreditActionType.ArticleFromBrief, "Empty AI response");
    throw new HttpError(500, "OpenAI returned an empty response");
  }

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
    throw new HttpError(
      500,
      "AI response is missing required fields (title, content)",
    );
  }

  // Create the SeoAgentPost with status "draft"
  const post = await context.entities.SeoAgentPost.create({
    data: {
      agentId: agent.id,
      userId: context.user.id,
      contentType: "internal_blog",
      title: parsed.title,
      content: parsed.content,
      metaDescription: parsed.metaDescription ?? null,
      slug: parsed.slug ?? null,
      primaryKeyword: targetKeywords[0] ?? null,
      secondaryKeywords: parsed.secondaryKeywords ?? [],
      faqSchema: parsed.faqSchema ?? undefined,
      status: "draft",
      aiMetadata: {
        model: "gpt-4o-mini",
        briefId: brief.id,
        clusterId: brief.clusterId ?? null,
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
        primaryKeyword: targetKeywords[0] ?? null,
        secondaryKeywords: parsed.secondaryKeywords ?? [],
        faqSchema: parsed.faqSchema ?? null,
        source: "ai_generated_from_brief",
        briefId: brief.id,
      },
    },
  });

  return post;
};

// ---------------------------------------------------------------------------
// Query: getContentBriefs
// ---------------------------------------------------------------------------

export const getContentBriefs: GetContentBriefs<any, any> = async (
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
    getContentBriefsSchema,
    rawArgs,
  );

  return context.entities.SeoAgentContentBrief.findMany({
    where: {
      agentId: args.agentId,
      userId: context.user.id,
    },
    include: {
      cluster: true,
    },
    orderBy: { createdAt: "desc" },
  });
};
