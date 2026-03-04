import { HttpError } from "wasp/server";
import { prisma } from "wasp/server";
import type {
  UploadPostMedia,
  GeneratePostImage,
  DeletePostMedia,
  ReorderPostMedia,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import OpenAI from "openai";
import { deductCredits, refundCredits } from "../../credits/creditService";
import { CreditActionType } from "../../credits/creditConfig";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPostEntity(context: any, postType: "social" | "seo") {
  return postType === "social"
    ? context.entities.SocialMediaAgentPost
    : context.entities.SeoAgentPost;
}

async function verifyPostOwnership(
  context: any,
  postType: "social" | "seo",
  postId: string
): Promise<any> {
  const entity = getPostEntity(context, postType);
  const post = await entity.findUnique({ where: { id: postId } });

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  if (post.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  return post;
}

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
// Zod schemas
// ---------------------------------------------------------------------------

const postTypeEnum = z.enum(["social", "seo"]);

const uploadPostMediaSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
  type: z.enum(["image", "video"]),
  fileUrl: z.string().url(),
  filePath: z.string().optional(),
});

const generatePostImageSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
  prompt: z.string().min(1),
});

const deletePostMediaSchema = z.object({
  id: z.string().uuid(),
});

const reorderPostMediaSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ),
});

// ---------------------------------------------------------------------------
// 1. uploadPostMedia
// ---------------------------------------------------------------------------

export const uploadPostMedia: UploadPostMedia<
  z.infer<typeof uploadPostMediaSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(uploadPostMediaSchema, rawArgs);

  // Verify post belongs to user
  await verifyPostOwnership(context, args.postType, args.postId);

  // Get max sortOrder for existing media on this post
  const whereClause: any = { postType: args.postType };
  if (args.postType === "social") {
    whereClause.socialPostId = args.postId;
  } else {
    whereClause.seoPostId = args.postId;
  }

  const existingMedia = await context.entities.PostMedia.findMany({
    where: whereClause,
    orderBy: { sortOrder: "desc" },
    take: 1,
  });

  const nextSortOrder =
    existingMedia.length > 0 ? existingMedia[0].sortOrder + 1 : 0;

  // Build create data
  const createData: any = {
    postType: args.postType,
    userId: context.user.id,
    type: args.type,
    source: "uploaded",
    fileUrl: args.fileUrl,
    filePath: args.filePath ?? null,
    sortOrder: nextSortOrder,
  };

  if (args.postType === "social") {
    createData.socialPostId = args.postId;
  } else {
    createData.seoPostId = args.postId;
  }

  const media = await context.entities.PostMedia.create({ data: createData });

  return media;
};

// ---------------------------------------------------------------------------
// 2. generatePostImage
// ---------------------------------------------------------------------------

export const generatePostImage: GeneratePostImage<
  z.infer<typeof generatePostImageSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    generatePostImageSchema,
    rawArgs
  );

  // Verify post belongs to user
  await verifyPostOwnership(context, args.postType, args.postId);

  // Get OpenAI API key
  const openai = await getOpenAIClient(context.entities.Setting);

  // Get max sortOrder for existing media on this post
  const whereClause: any = { postType: args.postType };
  if (args.postType === "social") {
    whereClause.socialPostId = args.postId;
  } else {
    whereClause.seoPostId = args.postId;
  }

  const existingMedia = await context.entities.PostMedia.findMany({
    where: whereClause,
    orderBy: { sortOrder: "desc" },
    take: 1,
  });

  const nextSortOrder =
    existingMedia.length > 0 ? existingMedia[0].sortOrder + 1 : 0;

  // Create PostMedia record in "processing" state
  const createData: any = {
    postType: args.postType,
    userId: context.user.id,
    type: "image",
    source: "ai_generated",
    aiStatus: "processing",
    aiPrompt: args.prompt,
    sortOrder: nextSortOrder,
  };

  if (args.postType === "social") {
    createData.socialPostId = args.postId;
  } else {
    createData.seoPostId = args.postId;
  }

  // Deduct credits before AI image generation
  await deductCredits(prisma, context.user.id, CreditActionType.AiImage, { postId: args.postId });

  const media = await context.entities.PostMedia.create({ data: createData });

  // Call OpenAI DALL-E
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: args.prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      // Refund on failure
      await refundCredits(prisma, context.user.id, CreditActionType.AiImage, "No image URL returned");
      const failedMedia = await context.entities.PostMedia.update({
        where: { id: media.id },
        data: {
          aiStatus: "failed",
          aiModel: "dall-e-3",
        },
      });
      return failedMedia;
    }

    // Update with generated image URL
    const updatedMedia = await context.entities.PostMedia.update({
      where: { id: media.id },
      data: {
        fileUrl: imageUrl,
        aiStatus: "completed",
        aiModel: "dall-e-3",
      },
    });

    return updatedMedia;
  } catch (error: any) {
    // Refund on error
    await refundCredits(prisma, context.user.id, CreditActionType.AiImage, "DALL-E generation failed");
    const failedMedia = await context.entities.PostMedia.update({
      where: { id: media.id },
      data: {
        aiStatus: "failed",
        aiModel: "dall-e-3",
      },
    });

    console.error("DALL-E image generation failed:", error?.message ?? error);
    return failedMedia;
  }
};

// ---------------------------------------------------------------------------
// 3. deletePostMedia
// ---------------------------------------------------------------------------

export const deletePostMedia: DeletePostMedia<
  z.infer<typeof deletePostMediaSchema>,
  void
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    deletePostMediaSchema,
    rawArgs
  );

  // Fetch and verify ownership
  const media = await context.entities.PostMedia.findUnique({
    where: { id: args.id },
  });

  if (!media) {
    throw new HttpError(404, "Media not found");
  }

  if (media.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  await context.entities.PostMedia.delete({ where: { id: args.id } });
};

// ---------------------------------------------------------------------------
// 4. reorderPostMedia
// ---------------------------------------------------------------------------

export const reorderPostMedia: ReorderPostMedia<
  z.infer<typeof reorderPostMediaSchema>,
  void
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    reorderPostMediaSchema,
    rawArgs
  );

  // Update each item's sortOrder, verifying ownership
  for (const item of args.items) {
    const media = await context.entities.PostMedia.findUnique({
      where: { id: item.id },
    });

    if (!media) {
      throw new HttpError(404, `Media with id "${item.id}" not found`);
    }

    if (media.userId !== context.user.id) {
      throw new HttpError(403, `Not authorized to reorder media "${item.id}"`);
    }

    await context.entities.PostMedia.update({
      where: { id: item.id },
      data: { sortOrder: item.sortOrder },
    });
  }
};
