import { HttpError } from "wasp/server";
import { prisma } from "wasp/server";
import type {
  ResearchKeywords,
  GetSeoKeywords,
  DeleteSeoKeyword,
  ClusterKeywords,
  GetSeoAgentClusters,
} from "wasp/server/operations";
import OpenAI from "openai";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import {
  getRelatedKeywords,
  getDomainKeywords,
  calculateOpportunityScore,
} from "./spyfuClient";
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
// Helpers
// ---------------------------------------------------------------------------

async function getSpyfuApiKey(settingEntity: any): Promise<string> {
  const apiKey = await getSecureSetting(settingEntity, "platform.spyfu_api_key");
  if (!apiKey) {
    throw new HttpError(
      400,
      "SpyFu API key not configured. Go to Admin Settings to add it.",
    );
  }
  return apiKey;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const researchKeywordsSchema = z.object({
  agentId: z.string().uuid("Invalid agent id"),
  keyword: z.string().optional(),
  domain: z.string().optional(),
  source: z.enum(["related", "domain"]).default("related"),
});

const getSeoKeywordsSchema = z.object({
  agentId: z.string().uuid("Invalid agent id"),
  sortBy: z
    .enum(["opportunityScore", "searchVolume", "keywordDifficulty"])
    .default("opportunityScore"),
  intent: z.string().optional(),
});

const deleteSeoKeywordSchema = z.object({
  id: z.string().uuid("Invalid keyword id"),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const researchKeywords: ResearchKeywords<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(researchKeywordsSchema, rawArgs);

  // Verify agent ownership
  const agent = await context.entities.SeoAgent.findUnique({
    where: { id: args.agentId },
  });

  if (!agent) {
    throw new HttpError(404, "SEO Agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this agent");
  }

  // Deduct credits for keyword research
  await deductCredits(prisma, context.user.id, CreditActionType.KeywordResearch, { agentId: agent.id });

  // Get SpyFu API key from settings
  const apiKey = await getSpyfuApiKey(context.entities.Setting);

  // Fetch keywords from SpyFu
  let results;

  if (args.source === "domain" && args.domain) {
    results = await getDomainKeywords(apiKey, args.domain);
  } else {
    // Use provided keyword, or fall back to the agent's first seed keyword
    const seedKeywords = (agent.seedKeywords as string[]) || [];
    const seedKeyword = args.keyword || seedKeywords[0];

    if (!seedKeyword) {
      throw new HttpError(
        400,
        "No keyword provided and agent has no seed keywords configured.",
      );
    }

    results = await getRelatedKeywords(apiKey, seedKeyword);
  }

  if (results.length === 0) {
    return { added: 0 };
  }

  // Get existing keywords for this agent to avoid duplicates
  const existingKeywords = await context.entities.SeoAgentKeyword.findMany({
    where: { agentId: args.agentId },
    select: { keyword: true },
  });

  const existingSet = new Set(
    existingKeywords.map((k: { keyword: string }) => k.keyword.toLowerCase()),
  );

  // Filter out duplicates
  const newResults = results.filter(
    (r) => !existingSet.has(r.keyword.toLowerCase()),
  );

  if (newResults.length === 0) {
    return { added: 0 };
  }

  // Create new keyword records
  const createData = newResults.map((r) => ({
    agentId: args.agentId,
    userId: context.user!.id,
    keyword: r.keyword,
    searchVolume: r.searchVolume || null,
    keywordDifficulty: r.keywordDifficulty || null,
    cpc: r.cpc || null,
    intent: r.intent || null,
    opportunityScore: calculateOpportunityScore(
      r.searchVolume || 0,
      r.keywordDifficulty || 0,
      r.cpc || 0,
    ),
    source: "spyfu",
  }));

  await context.entities.SeoAgentKeyword.createMany({
    data: createData,
    skipDuplicates: true,
  });

  return { added: newResults.length };
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getSeoKeywords: GetSeoKeywords<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(getSeoKeywordsSchema, rawArgs);

  const where: Record<string, any> = {
    agentId: args.agentId,
    userId: context.user.id,
  };

  if (args.intent) {
    where.intent = args.intent;
  }

  // Build orderBy based on sortBy parameter
  const orderBy: Record<string, string> = {};
  orderBy[args.sortBy] = "desc";

  return context.entities.SeoAgentKeyword.findMany({
    where,
    orderBy,
  });
};

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export const deleteSeoKeyword: DeleteSeoKeyword<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(deleteSeoKeywordSchema, rawArgs);

  // Verify ownership
  const existing = await context.entities.SeoAgentKeyword.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new HttpError(404, "Keyword not found");
  }

  if (existing.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this keyword");
  }

  await context.entities.SeoAgentKeyword.delete({
    where: { id: args.id },
  });
};

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
// Schemas (clustering)
// ---------------------------------------------------------------------------

const clusterKeywordsSchema = z.object({
  agentId: z.string().uuid("Invalid agent id"),
});

const getSeoAgentClustersSchema = z.object({
  agentId: z.string().uuid("Invalid agent id"),
});

// ---------------------------------------------------------------------------
// Action: clusterKeywords
// ---------------------------------------------------------------------------

export const clusterKeywords: ClusterKeywords<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(clusterKeywordsSchema, rawArgs);

  // Verify agent ownership
  const agent = await context.entities.SeoAgent.findUnique({
    where: { id: args.agentId },
  });

  if (!agent) {
    throw new HttpError(404, "SEO Agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this agent");
  }

  // Fetch all keywords for this agent
  const keywords = await context.entities.SeoAgentKeyword.findMany({
    where: {
      agentId: args.agentId,
      userId: context.user.id,
    },
  });

  if (keywords.length === 0) {
    throw new HttpError(
      400,
      "No keywords found for this agent. Research keywords first.",
    );
  }

  const keywordList = keywords.map((k: any) => k.keyword);

  // Deduct credits
  await deductCredits(prisma, context.user.id, CreditActionType.KeywordClustering, { agentId: args.agentId });

  // Get OpenAI client
  const openai = await getOpenAIClient(context.entities.Setting);

  // Call OpenAI to cluster keywords by topic/intent
  const systemPrompt = `You are an SEO expert. Group these keywords into topical clusters.

Keywords:
${keywordList.map((kw: string) => `- ${kw}`).join("\n")}

Group them by topic relevance and search intent. Each cluster should represent a single topic that could be covered by one comprehensive article.

Return a JSON object with this exact structure:
{
  "clusters": [
    {
      "name": "Descriptive cluster name",
      "keywords": ["keyword 1", "keyword 2"],
      "intent": "informational"
    }
  ]
}

The intent must be one of: "informational", "commercial", "transactional", "navigational".`;

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Cluster these ${keywordList.length} keywords into topical groups.`,
        },
      ],
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });
  } catch (error) {
    await refundCredits(prisma, context.user.id, CreditActionType.KeywordClustering, "AI clustering failed");
    throw error;
  }

  const responseText = completion.choices[0]?.message?.content;

  if (!responseText) {
    await refundCredits(prisma, context.user.id, CreditActionType.KeywordClustering, "Empty AI response");
    throw new HttpError(500, "OpenAI returned an empty response");
  }

  let parsed: {
    clusters: Array<{
      name: string;
      keywords: string[];
      intent: string;
    }>;
  };

  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new HttpError(500, "Failed to parse AI response as JSON");
  }

  if (!parsed.clusters || !Array.isArray(parsed.clusters)) {
    throw new HttpError(500, "AI response is missing required field (clusters)");
  }

  // Create SeoAgentCluster records
  const createdClusters: any[] = [];

  for (const cluster of parsed.clusters) {
    const created = await context.entities.SeoAgentCluster.create({
      data: {
        agentId: args.agentId,
        userId: context.user.id,
        name: cluster.name,
        keywords: cluster.keywords,
        intent: cluster.intent || null,
      },
    });
    createdClusters.push(created);
  }

  return createdClusters;
};

// ---------------------------------------------------------------------------
// Query: getSeoAgentClusters
// ---------------------------------------------------------------------------

export const getSeoAgentClusters: GetSeoAgentClusters<any, any> = async (
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
    getSeoAgentClustersSchema,
    rawArgs,
  );

  return context.entities.SeoAgentCluster.findMany({
    where: {
      agentId: args.agentId,
      userId: context.user.id,
    },
    include: {
      contentBriefs: true,
    },
    orderBy: { createdAt: "desc" },
  });
};
