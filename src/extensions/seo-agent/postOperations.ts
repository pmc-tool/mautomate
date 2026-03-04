import { HttpError } from "wasp/server";
import type {
  GetSeoPosts,
  GetSeoPost,
  CreateSeoPost,
  UpdateSeoPost,
  DeleteSeoPost,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";

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

const getSeoPostsSchema = z.object({
  agentId: z.string().uuid().optional(),
  status: z.string().optional(),
  contentType: z.string().optional(),
});

const getSeoPostSchema = z.object({
  id: z.string().uuid("Invalid post id"),
});

const contentTypeEnum = z.enum(["internal_blog", "external_blog", "social"]);

const createSeoPostSchema = z.object({
  agentId: z.string().uuid("Agent id is required"),
  contentType: contentTypeEnum.default("internal_blog"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  metaDescription: z.string().optional(),
  slug: z.string().optional(),
  primaryKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).default([]),
  seoScore: z.number().int().min(0).max(100).optional(),
  aeoScore: z.number().int().min(0).max(100).optional(),
  faqSchema: z.any().optional(),
  status: z.string().default("draft"),
  scheduledAt: z.string().datetime().optional(),
  aiMetadata: z.any().optional(),
});

const updateSeoPostSchema = z.object({
  id: z.string().uuid("Invalid post id"),
  contentType: contentTypeEnum.optional(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  metaDescription: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  primaryKeyword: z.string().nullable().optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  seoScore: z.number().int().min(0).max(100).nullable().optional(),
  aeoScore: z.number().int().min(0).max(100).nullable().optional(),
  faqSchema: z.any().optional(),
  status: z.string().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  aiMetadata: z.any().optional(),
});

const deleteSeoPostSchema = z.object({
  id: z.string().uuid("Invalid post id"),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getSeoPosts: GetSeoPosts<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(getSeoPostsSchema, rawArgs);

  const where: Record<string, any> = { userId: context.user.id };

  if (args.agentId) {
    where.agentId = args.agentId;
  }

  if (args.status) {
    where.status = args.status;
  }

  if (args.contentType) {
    where.contentType = args.contentType;
  }

  return context.entities.SeoAgentPost.findMany({
    where,
    include: {
      agent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};

export const getSeoPost: GetSeoPost<{ id: string }, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(getSeoPostSchema, rawArgs);

  const post = await context.entities.SeoAgentPost.findUnique({
    where: { id: args.id },
    include: {
      agent: true,
      revisions: {
        orderBy: { createdAt: "desc" },
      },
      media: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!post) {
    throw new HttpError(404, "SEO Post not found");
  }

  if (post.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this post");
  }

  return post;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const createSeoPost: CreateSeoPost<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(createSeoPostSchema, rawArgs);

  // Verify the agent belongs to the current user
  const agent = await context.entities.SeoAgent.findUnique({
    where: { id: args.agentId },
  });

  if (!agent) {
    throw new HttpError(404, "SEO Agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this agent");
  }

  // Create the post
  const post = await context.entities.SeoAgentPost.create({
    data: {
      agentId: args.agentId,
      userId: context.user.id,
      contentType: args.contentType,
      title: args.title,
      content: args.content,
      metaDescription: args.metaDescription ?? null,
      slug: args.slug ?? null,
      primaryKeyword: args.primaryKeyword ?? null,
      secondaryKeywords: args.secondaryKeywords,
      seoScore: args.seoScore ?? null,
      aeoScore: args.aeoScore ?? null,
      faqSchema: args.faqSchema ?? undefined,
      status: args.status,
      scheduledAt: args.scheduledAt ? new Date(args.scheduledAt) : null,
      aiMetadata: args.aiMetadata ?? undefined,
    },
  });

  // Create the initial revision
  await context.entities.PostRevision.create({
    data: {
      seoPostId: post.id,
      userId: context.user.id,
      action: "created",
      postType: "seo",
      statusTo: "draft",
      snapshot: {
        title: args.title,
        content: args.content,
        metaDescription: args.metaDescription ?? null,
      },
    },
  });

  return post;
};

export const updateSeoPost: UpdateSeoPost<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(updateSeoPostSchema, rawArgs);

  // Verify ownership
  const existing = await context.entities.SeoAgentPost.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new HttpError(404, "SEO Post not found");
  }

  if (existing.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this post");
  }

  // Build the update data, only including fields that were provided
  const { id, scheduledAt, ...rest } = args;
  const updateData: Record<string, any> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  // Handle scheduledAt separately for Date conversion
  if (scheduledAt !== undefined) {
    updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
  }

  const updatedPost = await context.entities.SeoAgentPost.update({
    where: { id: args.id },
    data: updateData,
  });

  // Determine what changed for the revision
  const statusFrom = existing.status;
  const statusTo = args.status ?? existing.status;

  // Create a revision for this update
  await context.entities.PostRevision.create({
    data: {
      seoPostId: updatedPost.id,
      userId: context.user.id,
      action: "updated",
      postType: "seo",
      statusFrom,
      statusTo,
      snapshot: {
        title: updatedPost.title,
        content: updatedPost.content,
        metaDescription: updatedPost.metaDescription,
      },
    },
  });

  return updatedPost;
};

export const deleteSeoPost: DeleteSeoPost<any, any> = async (
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

  const args = ensureArgsSchemaOrThrowHttpError(deleteSeoPostSchema, rawArgs);

  // Verify ownership
  const existing = await context.entities.SeoAgentPost.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new HttpError(404, "SEO Post not found");
  }

  if (existing.userId !== context.user.id) {
    throw new HttpError(403, "You do not own this post");
  }

  return context.entities.SeoAgentPost.delete({
    where: { id: args.id },
  });
};
