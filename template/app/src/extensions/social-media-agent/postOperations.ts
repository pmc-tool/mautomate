import { HttpError } from "wasp/server";
import type {
  GetSocialMediaPosts,
  GetSocialMediaPost,
  CreateSocialMediaPost,
  UpdateSocialMediaPost,
  DeleteSocialMediaPost,
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
      "Social Media Agent extension is not activated."
    );
  }
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const getSocialMediaPostsSchema = z.object({
  agentId: z.string().uuid().optional(),
  status: z.string().optional(),
  platform: z.string().optional(),
});

const getSocialMediaPostByIdSchema = z.object({
  id: z.string().uuid(),
});

const createSocialMediaPostSchema = z.object({
  agentId: z.string().uuid(),
  content: z.string().min(1, "Content is required"),
  hashtags: z.string().optional().nullable(),
  platform: z.enum(["facebook", "instagram", "linkedin", "x"]),
  status: z.string().default("draft"),
  imageUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  aiMetadata: z.any().optional().nullable(),
  socialAccountId: z.string().uuid().optional().nullable(),
});

const updateSocialMediaPostSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).optional(),
  hashtags: z.string().optional().nullable(),
  platform: z.enum(["facebook", "instagram", "linkedin", "x"]).optional(),
  status: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  aiMetadata: z.any().optional().nullable(),
  socialAccountId: z.string().uuid().optional().nullable(),
});

const deleteSocialMediaPostSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getSocialMediaPosts: GetSocialMediaPosts<
  z.infer<typeof getSocialMediaPostsSchema>,
  any[]
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(
    getSocialMediaPostsSchema,
    rawArgs
  );

  const where: any = { userId: context.user.id };

  if (args.agentId) {
    where.agentId = args.agentId;
  }
  if (args.status) {
    where.status = args.status;
  }
  if (args.platform) {
    where.platform = args.platform;
  }

  return context.entities.SocialMediaAgentPost.findMany({
    where,
    include: {
      agent: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
};

export const getSocialMediaPost: GetSocialMediaPost<
  z.infer<typeof getSocialMediaPostByIdSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(
    getSocialMediaPostByIdSchema,
    rawArgs
  );

  const post = await context.entities.SocialMediaAgentPost.findUnique({
    where: { id: args.id },
    include: {
      agent: { select: { name: true } },
      revisions: { orderBy: { createdAt: "desc" } },
      media: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  if (post.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  return post;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const createSocialMediaPost: CreateSocialMediaPost<
  z.infer<typeof createSocialMediaPostSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(
    createSocialMediaPostSchema,
    rawArgs
  );

  // Verify the agent belongs to the user
  const agent = await context.entities.SocialMediaAgent.findUnique({
    where: { id: args.agentId },
  });

  if (!agent) {
    throw new HttpError(404, "Agent not found");
  }

  if (agent.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized to use this agent");
  }

  // Create the post
  const post = await context.entities.SocialMediaAgentPost.create({
    data: {
      agentId: args.agentId,
      userId: context.user.id,
      content: args.content,
      hashtags: args.hashtags ?? null,
      platform: args.platform,
      status: args.status ?? "draft",
      imageUrl: args.imageUrl ?? null,
      videoUrl: args.videoUrl ?? null,
      scheduledAt: args.scheduledAt ? new Date(args.scheduledAt) : null,
      aiMetadata: args.aiMetadata ?? undefined,
      socialAccountId: args.socialAccountId ?? null,
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
      userId: context.user.id,
      action: "created",
      statusTo: "draft",
      snapshot: {
        content: post.content,
        hashtags: post.hashtags,
        platform: post.platform,
        status: post.status,
        imageUrl: post.imageUrl,
        videoUrl: post.videoUrl,
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
      },
    },
  });

  return post;
};

export const updateSocialMediaPost: UpdateSocialMediaPost<
  z.infer<typeof updateSocialMediaPostSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(
    updateSocialMediaPostSchema,
    rawArgs
  );

  // Verify ownership
  const existing = await context.entities.SocialMediaAgentPost.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new HttpError(404, "Post not found");
  }

  if (existing.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  // Determine which fields changed
  const changedFields: string[] = [];
  const updateData: any = {};

  if (args.content !== undefined && args.content !== existing.content) {
    changedFields.push("content");
    updateData.content = args.content;
  }
  if (args.hashtags !== undefined && args.hashtags !== existing.hashtags) {
    changedFields.push("hashtags");
    updateData.hashtags = args.hashtags ?? null;
  }
  if (args.platform !== undefined && args.platform !== existing.platform) {
    changedFields.push("platform");
    updateData.platform = args.platform;
  }
  if (args.status !== undefined && args.status !== existing.status) {
    changedFields.push("status");
    updateData.status = args.status;
  }
  if (args.imageUrl !== undefined && args.imageUrl !== existing.imageUrl) {
    changedFields.push("imageUrl");
    updateData.imageUrl = args.imageUrl ?? null;
  }
  if (args.videoUrl !== undefined && args.videoUrl !== existing.videoUrl) {
    changedFields.push("videoUrl");
    updateData.videoUrl = args.videoUrl ?? null;
  }
  if (args.scheduledAt !== undefined) {
    const newScheduledAt = args.scheduledAt ? new Date(args.scheduledAt) : null;
    const existingStr = existing.scheduledAt?.toISOString() ?? null;
    const newStr = newScheduledAt?.toISOString() ?? null;
    if (existingStr !== newStr) {
      changedFields.push("scheduledAt");
      updateData.scheduledAt = newScheduledAt;
    }
  }
  if (args.aiMetadata !== undefined) {
    changedFields.push("aiMetadata");
    updateData.aiMetadata = args.aiMetadata ?? undefined;
  }
  if (args.socialAccountId !== undefined && args.socialAccountId !== existing.socialAccountId) {
    changedFields.push("socialAccountId");
    updateData.socialAccountId = args.socialAccountId ?? null;
  }

  // Update the post
  const updatedPost = await context.entities.SocialMediaAgentPost.update({
    where: { id: args.id },
    data: updateData,
    include: {
      agent: { select: { name: true } },
    },
  });

  // Create revision with snapshot of old data
  await context.entities.PostRevision.create({
    data: {
      postType: "social",
      socialPostId: args.id,
      userId: context.user.id,
      action: "updated",
      statusFrom: existing.status,
      statusTo: updatedPost.status,
      snapshot: {
        content: existing.content,
        hashtags: existing.hashtags,
        platform: existing.platform,
        status: existing.status,
        imageUrl: existing.imageUrl,
        videoUrl: existing.videoUrl,
        scheduledAt: existing.scheduledAt?.toISOString() ?? null,
      },
      changedFields,
    },
  });

  return updatedPost;
};

export const deleteSocialMediaPost: DeleteSocialMediaPost<
  z.infer<typeof deleteSocialMediaPostSchema>,
  void
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(
    deleteSocialMediaPostSchema,
    rawArgs
  );

  const post = await context.entities.SocialMediaAgentPost.findUnique({
    where: { id: args.id },
  });

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  if (post.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  await context.entities.SocialMediaAgentPost.delete({
    where: { id: args.id },
  });
};
