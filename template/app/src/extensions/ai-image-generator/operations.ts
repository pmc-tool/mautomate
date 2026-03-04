import { HttpError } from "wasp/server";
import type {
  GenerateImage,
  CheckImageStatus,
  GetUserImages,
  DeleteImage,
} from "wasp/server/operations";
import type { GeneratedImage } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import { submitTxt2Img, checkTaskResult } from "./novitaClient";

const NOVITA_API_KEY_SETTING = "ext.ai-image-generator.novita_api_key";
const EXTENSION_ID = "ai-image-generator";

async function getNovitaApiKey(settingEntity: any): Promise<string> {
  const setting = await settingEntity.findUnique({
    where: { key: NOVITA_API_KEY_SETTING },
  });
  if (!setting?.value) {
    throw new HttpError(
      400,
      "Novita API key not configured. Ask your admin to set it up."
    );
  }
  return setting.value;
}

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
      "AI Image Generator extension is not activated. Enable it in the Marketplace."
    );
  }
}

//#region Actions

const generateImageInputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  negativePrompt: z.string().max(1000).optional(),
  width: z.number().int().min(128).max(2048),
  height: z.number().int().min(128).max(2048),
  steps: z.number().int().min(1).max(50).optional(),
  modelName: z.string().min(1),
});

type GenerateImageInput = z.infer<typeof generateImageInputSchema>;

export const generateImage: GenerateImage<
  GenerateImageInput,
  GeneratedImage
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    generateImageInputSchema,
    rawArgs
  );

  await ensureExtensionActive(context.entities.UserExtension, context.user.id);
  const apiKey = await getNovitaApiKey(context.entities.Setting);

  let taskId: string;
  try {
    const result = await submitTxt2Img(apiKey, {
      prompt: args.prompt,
      negativePrompt: args.negativePrompt,
      width: args.width,
      height: args.height,
      steps: args.steps,
      modelName: args.modelName,
    });
    taskId = result.taskId;
  } catch (err: any) {
    return context.entities.GeneratedImage.create({
      data: {
        userId: context.user.id,
        prompt: args.prompt,
        modelName: args.modelName,
        width: args.width,
        height: args.height,
        status: "failed",
        errorMsg: err.message || "Failed to submit image generation",
      },
    });
  }

  return context.entities.GeneratedImage.create({
    data: {
      userId: context.user.id,
      prompt: args.prompt,
      modelName: args.modelName,
      width: args.width,
      height: args.height,
      status: "processing",
      taskId,
    },
  });
};

const checkImageStatusInputSchema = z.object({
  imageId: z.string().min(1),
});

type CheckImageStatusInput = z.infer<typeof checkImageStatusInputSchema>;

export const checkImageStatus: CheckImageStatus<
  CheckImageStatusInput,
  GeneratedImage
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { imageId } = ensureArgsSchemaOrThrowHttpError(
    checkImageStatusInputSchema,
    rawArgs
  );

  const image = await context.entities.GeneratedImage.findFirst({
    where: { id: imageId, userId: context.user.id },
  });

  if (!image) {
    throw new HttpError(404, "Image not found");
  }

  if (image.status !== "processing" || !image.taskId) {
    return image;
  }

  const apiKey = await getNovitaApiKey(context.entities.Setting);

  try {
    const result = await checkTaskResult(apiKey, image.taskId);

    if (result.status === "COMPLETED") {
      return context.entities.GeneratedImage.update({
        where: { id: image.id },
        data: { status: "completed", imageUrl: result.imageUrl },
      });
    }

    if (result.status === "FAILED") {
      return context.entities.GeneratedImage.update({
        where: { id: image.id },
        data: {
          status: "failed",
          errorMsg: result.errorMsg || "Generation failed",
        },
      });
    }
  } catch (err: any) {
    // Don't fail on polling errors, just return current state
    console.error("Error checking image status:", err.message);
  }

  return image;
};

//#endregion

//#region Queries

export const getUserImages: GetUserImages<void, GeneratedImage[]> = async (
  _args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.GeneratedImage.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
};

//#endregion

//#region Delete

const deleteImageInputSchema = z.object({
  id: z.string().min(1),
});

type DeleteImageInput = z.infer<typeof deleteImageInputSchema>;

export const deleteImage: DeleteImage<DeleteImageInput, GeneratedImage> = async (
  rawArgs,
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    deleteImageInputSchema,
    rawArgs
  );

  return context.entities.GeneratedImage.delete({
    where: { id, userId: context.user.id },
  });
};

//#endregion
