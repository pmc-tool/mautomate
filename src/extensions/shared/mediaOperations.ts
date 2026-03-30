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
import { deductCredits, refundCredits } from "../../credits/creditService";
import { CreditActionType } from "../../credits/creditConfig";
import { getSecureSetting } from "../../server/settingEncryption";
import { submitTxt2Img, checkTaskResult } from "../ai-image-generator/novitaClient";
import { uploadFileToS3 } from "../../file-upload/s3Utils";
import { randomUUID } from "crypto";

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

const NOVITA_API_KEY_SETTING = "ext.ai-image-generator.novita_api_key";
const DEFAULT_MODEL = "dreamshaper_8_93211.safetensors";
const MAX_POLL_ATTEMPTS = 60; // 60 * 2s = 2 min max wait
const POLL_INTERVAL_MS = 2000;

async function getNovitaApiKey(settingEntity: any): Promise<string> {
  const apiKey = await getSecureSetting(settingEntity, NOVITA_API_KEY_SETTING);
  if (!apiKey) {
    throw new HttpError(
      400,
      "Novita API key not configured. Ask your admin to set it up in AI Image Generator settings."
    );
  }
  return apiKey;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadAndUploadToS3(
  imageUrl: string,
  userId: string
): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const s3Key = `${userId}/${randomUUID()}.png`;
  await uploadFileToS3({ buffer, s3Key, contentType: "image/png" });
  return s3Key;
}

function buildImagePromptFromPost(
  post: any,
  postType: string,
  userPrompt: string
): string {
  const contextParts: string[] = [];
  if (postType === "social") {
    if (post.content) contextParts.push(`Post content: ${post.content.substring(0, 500)}`);
    if (post.platform) contextParts.push(`Platform: ${post.platform}`);
  } else {
    if (post.title) contextParts.push(`Article title: ${post.title}`);
    if (post.content) {
      const plainText = post.content.replace(/<[^>]+>/g, "").substring(0, 500);
      contextParts.push(`Article content: ${plainText}`);
    }
    if (post.primaryKeyword) contextParts.push(`Topic keyword: ${post.primaryKeyword}`);
  }

  if (contextParts.length > 0) {
    return `${userPrompt}. Context of the post this image is for: ${contextParts.join(". ")}`;
  }
  return userPrompt;
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
  const post = await verifyPostOwnership(context, args.postType, args.postId);

  // Get Novita API key
  const novitaKey = await getNovitaApiKey(context.entities.Setting);

  // Build prompt with post context
  const enrichedPrompt = buildImagePromptFromPost(post, args.postType, args.prompt);

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

  // Call Novita AI for image generation
  try {
    const { taskId } = await submitTxt2Img(novitaKey, {
      prompt: enrichedPrompt,
      width: 1024,
      height: 1024,
      steps: 20,
      modelName: DEFAULT_MODEL,
    });

    // Poll for result
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await sleep(POLL_INTERVAL_MS);
      const result = await checkTaskResult(novitaKey, taskId);

      if (result.status === "COMPLETED" && result.imageUrl) {
        // Download from Novita temp URL and upload to S3 for permanent storage
        const s3Key = await downloadAndUploadToS3(result.imageUrl, context.user.id);
        const permanentUrl = `/api/files/${s3Key}`;

        const updatedMedia = await context.entities.PostMedia.update({
          where: { id: media.id },
          data: {
            fileUrl: permanentUrl,
            filePath: s3Key,
            aiStatus: "completed",
            aiModel: DEFAULT_MODEL,
          },
        });
        return updatedMedia;
      }

      if (result.status === "FAILED") {
        await refundCredits(prisma, context.user.id, CreditActionType.AiImage, "Novita generation failed");
        const failedMedia = await context.entities.PostMedia.update({
          where: { id: media.id },
          data: {
            aiStatus: "failed",
            aiModel: DEFAULT_MODEL,
          },
        });
        console.error("Novita image generation failed:", result.errorMsg);
        return failedMedia;
      }
    }

    // Timed out
    await refundCredits(prisma, context.user.id, CreditActionType.AiImage, "Image generation timed out");
    const failedMedia = await context.entities.PostMedia.update({
      where: { id: media.id },
      data: {
        aiStatus: "failed",
        aiModel: DEFAULT_MODEL,
      },
    });
    return failedMedia;
  } catch (error: any) {
    await refundCredits(prisma, context.user.id, CreditActionType.AiImage, "Novita generation failed");
    const failedMedia = await context.entities.PostMedia.update({
      where: { id: media.id },
      data: {
        aiStatus: "failed",
        aiModel: DEFAULT_MODEL,
      },
    });
    console.error("Novita image generation failed:", error?.message ?? error);
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
