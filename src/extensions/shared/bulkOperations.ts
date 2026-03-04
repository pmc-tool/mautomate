import { HttpError } from "wasp/server";
import type {
  BulkApprove,
  BulkSchedule,
  BulkDelete,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";

// ---------------------------------------------------------------------------
// Extension guard
// ---------------------------------------------------------------------------

async function ensureAtLeastOneAgentExtension(
  userExtensionEntity: any,
  userId: string
): Promise<void> {
  const [socialExt, seoExt] = await Promise.all([
    userExtensionEntity.findUnique({
      where: {
        userId_extensionId: { userId, extensionId: "social-media-agent" },
      },
    }),
    userExtensionEntity.findUnique({
      where: {
        userId_extensionId: { userId, extensionId: "seo-agent" },
      },
    }),
  ]);

  if (!socialExt?.isActive && !seoExt?.isActive) {
    throw new HttpError(
      403,
      "You need at least one agent extension activated to manage posts."
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPostEntity(context: any, postType: "social" | "seo") {
  return postType === "social"
    ? context.entities.SocialMediaAgentPost
    : context.entities.SeoAgentPost;
}

async function createRevision(
  context: any,
  data: {
    postType: string;
    postId: string;
    userId: string;
    action: string;
    statusFrom?: string;
    statusTo?: string;
    notes?: string;
  }
) {
  const revisionData: any = {
    postType: data.postType,
    userId: data.userId,
    action: data.action,
    statusFrom: data.statusFrom,
    statusTo: data.statusTo,
    notes: data.notes,
  };

  if (data.postType === "social") {
    revisionData.socialPostId = data.postId;
  } else {
    revisionData.seoPostId = data.postId;
  }

  return context.entities.PostRevision.create({ data: revisionData });
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const postTypeEnum = z.enum(["social", "seo"]);

const postItemSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
});

const bulkApproveSchema = z.object({
  posts: z.array(postItemSchema).min(1),
});

const bulkScheduleSchema = z.object({
  posts: z.array(postItemSchema).min(1),
  scheduledAt: z.string(),
});

const bulkDeleteSchema = z.object({
  posts: z.array(postItemSchema).min(1),
});

// ---------------------------------------------------------------------------
// 1. bulkApprove
// ---------------------------------------------------------------------------

export const bulkApprove: BulkApprove<
  z.infer<typeof bulkApproveSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(bulkApproveSchema, rawArgs);

  let approved = 0;
  let skipped = 0;

  for (const item of args.posts) {
    try {
      const entity = getPostEntity(context, item.postType);
      const post = await entity.findUnique({ where: { id: item.postId } });

      if (!post || post.userId !== context.user.id) {
        skipped++;
        continue;
      }

      if (post.status !== "draft") {
        skipped++;
        continue;
      }

      await entity.update({
        where: { id: item.postId },
        data: {
          status: "approved",
          approvedAt: new Date(),
        },
      });

      await createRevision(context, {
        postType: item.postType,
        postId: item.postId,
        userId: context.user.id,
        action: "approved",
        statusFrom: "draft",
        statusTo: "approved",
      });

      approved++;
    } catch (error) {
      console.error(
        `bulkApprove: failed for ${item.postType} post ${item.postId}:`,
        error
      );
      skipped++;
    }
  }

  return { approved, skipped };
};

// ---------------------------------------------------------------------------
// 2. bulkSchedule
// ---------------------------------------------------------------------------

export const bulkSchedule: BulkSchedule<
  z.infer<typeof bulkScheduleSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(bulkScheduleSchema, rawArgs);

  const scheduledAt = new Date(args.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    throw new HttpError(400, "Invalid scheduledAt date.");
  }

  let scheduled = 0;
  let skipped = 0;

  for (const item of args.posts) {
    try {
      const entity = getPostEntity(context, item.postType);
      const post = await entity.findUnique({ where: { id: item.postId } });

      if (!post || post.userId !== context.user.id) {
        skipped++;
        continue;
      }

      if (post.status !== "approved") {
        skipped++;
        continue;
      }

      await entity.update({
        where: { id: item.postId },
        data: {
          status: "scheduled",
          scheduledAt,
        },
      });

      await createRevision(context, {
        postType: item.postType,
        postId: item.postId,
        userId: context.user.id,
        action: "scheduled",
        statusFrom: "approved",
        statusTo: "scheduled",
      });

      scheduled++;
    } catch (error) {
      console.error(
        `bulkSchedule: failed for ${item.postType} post ${item.postId}:`,
        error
      );
      skipped++;
    }
  }

  return { scheduled, skipped };
};

// ---------------------------------------------------------------------------
// 3. bulkDelete
// ---------------------------------------------------------------------------

export const bulkDelete: BulkDelete<
  z.infer<typeof bulkDeleteSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(bulkDeleteSchema, rawArgs);

  let deleted = 0;
  let skipped = 0;

  for (const item of args.posts) {
    try {
      const entity = getPostEntity(context, item.postType);
      const post = await entity.findUnique({ where: { id: item.postId } });

      if (!post || post.userId !== context.user.id) {
        skipped++;
        continue;
      }

      await entity.delete({ where: { id: item.postId } });

      deleted++;
    } catch (error) {
      console.error(
        `bulkDelete: failed for ${item.postType} post ${item.postId}:`,
        error
      );
      skipped++;
    }
  }

  return { deleted, skipped };
};
