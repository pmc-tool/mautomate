import { HttpError } from "wasp/server";
import type {
  GetSocialMediaAgents,
  GetSocialMediaAgent,
  CreateSocialMediaAgent,
  UpdateSocialMediaAgent,
  DeleteSocialMediaAgent,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";

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
      "Social Media Agent extension is not activated. Enable it in the Marketplace."
    );
  }
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createSocialMediaAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  companyId: z.string().uuid().optional().nullable(),
  platforms: z.array(z.string()).default([]),
  siteUrl: z.string().optional().nullable(),
  siteDescription: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  postTypes: z.array(z.string()).default([]),
  ctaTemplates: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  tone: z.string().optional().nullable(),
  brandingDescription: z.string().optional().nullable(),
  creativityLevel: z.number().int().min(1).max(10).default(5),
  hashtagCount: z.number().int().min(0).max(30).default(5),
  scheduleDays: z.array(z.string()).default([]),
  scheduleTimes: z.array(z.string()).default([]),
  dailyPostCount: z.number().int().min(1).max(20).default(1),
  publishingType: z.enum(["manual", "auto"]).default("manual"),
});

const updateSocialMediaAgentSchema = createSocialMediaAgentSchema.extend({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getSocialMediaAgents: GetSocialMediaAgents<void, any[]> = async (
  _args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  return context.entities.SocialMediaAgent.findMany({
    where: { userId: context.user.id },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });
};

export const getSocialMediaAgent: GetSocialMediaAgent<{ id: string }, any> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const agent = await context.entities.SocialMediaAgent.findUnique({
    where: { id: args.id },
    include: {
      company: true,
      posts: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!agent) {
    throw new HttpError(404, "Social media agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  return agent;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const createSocialMediaAgent: CreateSocialMediaAgent<
  z.infer<typeof createSocialMediaAgentSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(
    createSocialMediaAgentSchema,
    rawArgs
  );

  // If companyId provided, verify it belongs to the user
  if (args.companyId) {
    const company = await context.entities.Company.findUnique({
      where: { id: args.companyId },
    });

    if (!company) {
      throw new HttpError(404, "Company not found");
    }

    if (company.userId !== context.user.id) {
      throw new HttpError(403, "Not authorized to use this company");
    }
  }

  return context.entities.SocialMediaAgent.create({
    data: {
      userId: context.user.id,
      companyId: args.companyId ?? null,
      name: args.name,
      platforms: args.platforms,
      siteUrl: args.siteUrl ?? null,
      siteDescription: args.siteDescription ?? null,
      targetAudience: args.targetAudience ?? null,
      postTypes: args.postTypes,
      tone: args.tone ?? null,
      ctaTemplates: args.ctaTemplates,
      categories: args.categories,
      goals: args.goals,
      brandingDescription: args.brandingDescription ?? null,
      creativityLevel: args.creativityLevel,
      hashtagCount: args.hashtagCount,
      scheduleDays: args.scheduleDays,
      scheduleTimes: args.scheduleTimes,
      dailyPostCount: args.dailyPostCount,
      publishingType: args.publishingType,
      status: "active",
    },
    include: { company: true },
  });
};

export const updateSocialMediaAgent: UpdateSocialMediaAgent<
  z.infer<typeof updateSocialMediaAgentSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(
    updateSocialMediaAgentSchema,
    rawArgs
  );

  // Verify ownership
  const existing = await context.entities.SocialMediaAgent.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new HttpError(404, "Social media agent not found");
  }

  if (existing.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  return context.entities.SocialMediaAgent.update({
    where: { id: args.id },
    data: {
      companyId: args.companyId ?? null,
      name: args.name,
      platforms: args.platforms,
      siteUrl: args.siteUrl ?? null,
      siteDescription: args.siteDescription ?? null,
      targetAudience: args.targetAudience ?? null,
      postTypes: args.postTypes,
      tone: args.tone ?? null,
      ctaTemplates: args.ctaTemplates,
      categories: args.categories,
      goals: args.goals,
      brandingDescription: args.brandingDescription ?? null,
      creativityLevel: args.creativityLevel,
      hashtagCount: args.hashtagCount,
      scheduleDays: args.scheduleDays,
      scheduleTimes: args.scheduleTimes,
      dailyPostCount: args.dailyPostCount,
      publishingType: args.publishingType,
    },
    include: { company: true },
  });
};

export const deleteSocialMediaAgent: DeleteSocialMediaAgent<{ id: string }, void> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const agent = await context.entities.SocialMediaAgent.findUnique({
    where: { id: args.id },
  });

  if (!agent) {
    throw new HttpError(404, "Social media agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  await context.entities.SocialMediaAgent.delete({
    where: { id: args.id },
  });
};
