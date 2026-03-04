import { HttpError } from "wasp/server";
import type {
  GetSeoAgents,
  GetSeoAgent,
  CreateSeoAgent,
  UpdateSeoAgent,
  DeleteSeoAgent,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import { encrypt } from "../../social-connect/encryption";

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
// Schemas
// ---------------------------------------------------------------------------

const createSeoAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  companyId: z.string().uuid().optional(),
  seedKeywords: z.array(z.string()).default([]),
  siteUrl: z.string().optional(),
  niche: z.string().optional(),
  aiProvider: z.string().default("openai"),
  targetWordCount: z.number().int().min(500).max(10000).default(1500),
  contentTypes: z.array(z.string()).default([]),
  tone: z.string().optional(),
  language: z.string().default("en"),
  scheduleDays: z.array(z.string()).default([]),
  dailyContentCount: z.number().int().min(1).max(10).default(1),
  wpUrl: z.string().optional(),
  wpUsername: z.string().optional(),
  wpPassword: z.string().optional(),
  wpCategoryId: z.string().optional(),
});

const updateSeoAgentSchema = z.object({
  id: z.string().uuid("Invalid agent id"),
  name: z.string().min(1).optional(),
  companyId: z.string().uuid().nullable().optional(),
  seedKeywords: z.array(z.string()).optional(),
  siteUrl: z.string().nullable().optional(),
  niche: z.string().nullable().optional(),
  aiProvider: z.string().optional(),
  targetWordCount: z.number().int().min(500).max(10000).optional(),
  contentTypes: z.array(z.string()).optional(),
  tone: z.string().nullable().optional(),
  language: z.string().optional(),
  scheduleDays: z.array(z.string()).optional(),
  dailyContentCount: z.number().int().min(1).max(10).optional(),
  wpUrl: z.string().nullable().optional(),
  wpUsername: z.string().nullable().optional(),
  wpPassword: z.string().nullable().optional(),
  wpCategoryId: z.string().nullable().optional(),
  status: z.string().optional(),
});

const deleteSeoAgentSchema = z.object({
  id: z.string().uuid("Invalid agent id"),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getSeoAgents: GetSeoAgents<void, any> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(
    context.entities.UserExtension,
    context.user.id,
  );

  return context.entities.SeoAgent.findMany({
    where: { userId: context.user.id },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
};

export const getSeoAgent: GetSeoAgent<{ id: string }, any> = async (
  args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(
    context.entities.UserExtension,
    context.user.id,
  );

  const agent = await context.entities.SeoAgent.findUnique({
    where: { id: args.id },
    include: {
      posts: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      keywords: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      clusters: true,
    },
  });

  if (!agent) {
    throw new HttpError(404, "SEO Agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this agent");
  }

  return agent;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const createSeoAgent: CreateSeoAgent<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(createSeoAgentSchema, rawArgs);

  // Encrypt WordPress password if provided
  let encryptedWpPassword: string | undefined;
  if (args.wpPassword) {
    encryptedWpPassword = encrypt(args.wpPassword);
  }

  return context.entities.SeoAgent.create({
    data: {
      userId: context.user.id,
      name: args.name,
      companyId: args.companyId ?? null,
      seedKeywords: args.seedKeywords,
      siteUrl: args.siteUrl ?? null,
      niche: args.niche ?? null,
      aiProvider: args.aiProvider,
      targetWordCount: args.targetWordCount,
      contentTypes: args.contentTypes,
      tone: args.tone ?? null,
      language: args.language,
      scheduleDays: args.scheduleDays,
      dailyContentCount: args.dailyContentCount,
      wpUrl: args.wpUrl ?? null,
      wpUsername: args.wpUsername ?? null,
      wpPassword: encryptedWpPassword ?? null,
      wpCategoryId: args.wpCategoryId ?? null,
      status: "active",
    },
  });
};

export const updateSeoAgent: UpdateSeoAgent<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(updateSeoAgentSchema, rawArgs);

  // Verify ownership
  const existing = await context.entities.SeoAgent.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new HttpError(404, "SEO Agent not found");
  }

  if (existing.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this agent");
  }

  // Handle wpPassword: encrypt if non-empty, set null if empty string
  let wpPasswordValue: string | null | undefined;
  if (args.wpPassword !== undefined) {
    if (args.wpPassword === "" || args.wpPassword === null) {
      wpPasswordValue = null;
    } else {
      wpPasswordValue = encrypt(args.wpPassword);
    }
  }

  // Build the update data, only including fields that were provided
  const { id, wpPassword, ...rest } = args;
  const updateData: Record<string, any> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  if (wpPasswordValue !== undefined) {
    updateData.wpPassword = wpPasswordValue;
  }

  return context.entities.SeoAgent.update({
    where: { id: args.id },
    data: updateData,
  });
};

export const deleteSeoAgent: DeleteSeoAgent<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(deleteSeoAgentSchema, rawArgs);

  // Verify ownership
  const existing = await context.entities.SeoAgent.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new HttpError(404, "SEO Agent not found");
  }

  if (existing.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this agent");
  }

  return context.entities.SeoAgent.delete({
    where: { id: args.id },
  });
};
