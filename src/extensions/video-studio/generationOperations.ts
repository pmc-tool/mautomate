// ---------------------------------------------------------------------------
// Video Studio — Generation Actions (generate, check, retry, delete)
// ---------------------------------------------------------------------------

import { HttpError, prisma } from "wasp/server";
import type {
  GenerateVideo,
  CheckVideoStatus,
  RetryVideoGeneration,
  DeleteVideoGeneration,
  ImproveVideoPrompt,
} from "wasp/server/operations";
import { getModelByKey } from "./modelRegistry";
import { submitGeneration, checkStatus, getResult } from "./falClient";
import {
  CreditActionType,
  CREDIT_COSTS,
} from "../../credits/creditConfig";
import { deductCredits, refundCredits } from "../../credits/creditService";
import { getSecureSetting } from "../../server/settingEncryption";

const EXTENSION_ID = "video-studio";
const FAL_KEY_SETTING = "ext.video-studio.fal_api_key";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureExtensionActive(ueEntity: any, userId: string) {
  const ue = await ueEntity.findUnique({
    where: { userId_extensionId: { userId, extensionId: EXTENSION_ID } },
  });
  if (!ue || !ue.isActive) {
    throw new HttpError(403, "Video Studio extension is not active.");
  }
}

async function getFalApiKey(settingEntity: any): Promise<string> {
  const apiKey = await getSecureSetting(settingEntity, FAL_KEY_SETTING);
  if (!apiKey) {
    throw new HttpError(
      500,
      "fal.ai API key not configured. Ask your admin to set it in Settings.",
    );
  }
  return apiKey;
}

function getCreditAction(tier: string): CreditActionType {
  if (tier === "premium") return CreditActionType.VideoPremium;
  if (tier === "standard") return CreditActionType.VideoStandard;
  return CreditActionType.VideoBasic;
}

// ---------------------------------------------------------------------------
// generateVideo — submit to fal.ai, deduct credits, save requestId
// ---------------------------------------------------------------------------

export const generateVideo: GenerateVideo<
  {
    modelKey: string;
    prompt: string;
    negativePrompt?: string;
    duration?: number;
    aspectRatio?: string;
    resolution?: string;
    inputImageUrl?: string;
    inputVideoUrl?: string;
    projectId?: string;
    // Expanded params (stored in metadata, passed to fal.ai)
    enhancePrompt?: boolean;
    generateAudio?: boolean;
    seed?: number;
    cfgScale?: number;
    avatarId?: string;
    voicePresetId?: string;
    referenceImageUrls?: string[];
    firstFrameImageUrl?: string;
    lastFrameImageUrl?: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
  any
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const model = getModelByKey(args.modelKey);
  if (!model) throw new HttpError(400, `Unknown model: ${args.modelKey}`);

  if (!args.prompt?.trim() && model.type !== "upscale") {
    throw new HttpError(400, "Prompt is required");
  }

  if ((model.type === "itv") && !args.inputImageUrl && !model.supportsFirstLastFrame && !model.supportsReferenceImages) {
    throw new HttpError(400, "Input image URL is required for image-to-video models");
  }

  if (model.type === "upscale" && !args.inputVideoUrl) {
    throw new HttpError(400, "Input video URL is required for upscaling");
  }

  // First-last-frame models need at least a first frame image
  if (model.supportsFirstLastFrame && !args.firstFrameImageUrl && !args.inputImageUrl) {
    throw new HttpError(400, "At least a first frame image is required for this model");
  }

  // Reference models need reference images
  if (model.supportsReferenceImages && (!args.referenceImageUrls || args.referenceImageUrls.length === 0) && !args.inputImageUrl) {
    throw new HttpError(400, "At least one reference image is required for this model");
  }

  // Validate project belongs to user if provided
  if (args.projectId) {
    const project = await context.entities.VideoProject.findUnique({
      where: { id: args.projectId },
    });
    if (!project || project.userId !== context.user.id) {
      throw new HttpError(404, "Project not found");
    }
  }

  const creditAction = getCreditAction(model.tier);
  const creditCost = CREDIT_COSTS[creditAction];

  // Build metadata for storage
  const storedMetadata: Record<string, any> = {
    ...(args.metadata || {}),
  };
  if (args.enhancePrompt !== undefined) storedMetadata.enhance_prompt = args.enhancePrompt;
  if (args.generateAudio !== undefined) storedMetadata.generate_audio = args.generateAudio;
  if (args.seed !== undefined) storedMetadata.seed = args.seed;
  if (args.cfgScale !== undefined) storedMetadata.cfg_scale = args.cfgScale;
  if (args.avatarId) storedMetadata.avatar_id = args.avatarId;
  if (args.voicePresetId) storedMetadata.voice_preset_id = args.voicePresetId;
  if (args.referenceImageUrls?.length) storedMetadata.reference_image_urls = args.referenceImageUrls;
  if (args.firstFrameImageUrl) storedMetadata.first_frame_image_url = args.firstFrameImageUrl;
  if (args.lastFrameImageUrl) storedMetadata.last_frame_image_url = args.lastFrameImageUrl;

  // Deduct credits first
  await deductCredits(
    prisma,
    context.user.id,
    creditAction,
    { modelKey: args.modelKey, modelName: model.name },
  );

  // Create the generation record
  const generation = await context.entities.VideoGeneration.create({
    data: {
      userId: context.user.id,
      projectId: args.projectId || null,
      type: model.type,
      model: model.key,
      modelEndpoint: model.endpoint,
      prompt: args.prompt?.trim() || "",
      negativePrompt: args.negativePrompt?.trim() || null,
      inputImageUrl: args.inputImageUrl || args.firstFrameImageUrl || null,
      inputVideoUrl: args.inputVideoUrl || null,
      duration: args.duration || model.durations[0] || 5,
      aspectRatio: args.aspectRatio || "16:9",
      resolution: args.resolution || "720p",
      status: "queued",
      creditsCost: creditCost,
      metadata: Object.keys(storedMetadata).length > 0 ? storedMetadata : undefined,
    },
  });

  // Submit to fal.ai
  try {
    const apiKey = await getFalApiKey(context.entities.Setting);

    // Build params based on model type and capabilities
    const params: Record<string, unknown> = {
      prompt: args.prompt?.trim() || "",
    };

    if (args.negativePrompt) params.negative_prompt = args.negativePrompt.trim();
    if (args.duration) params.duration = args.duration;
    if (args.aspectRatio) params.aspect_ratio = args.aspectRatio;

    // Standard ITV: image_url
    if (model.type === "itv" && args.inputImageUrl) {
      params.image_url = args.inputImageUrl;
    }

    // First-last-frame model
    if (model.supportsFirstLastFrame) {
      if (args.firstFrameImageUrl) params.first_frame_image_url = args.firstFrameImageUrl;
      if (args.lastFrameImageUrl) params.last_frame_image_url = args.lastFrameImageUrl;
    }

    // Reference model
    if (model.supportsReferenceImages && args.referenceImageUrls?.length) {
      params.reference_image_urls = args.referenceImageUrls;
    }

    // Upscale
    if (model.type === "upscale" && args.inputVideoUrl) {
      params.video_url = args.inputVideoUrl;
    }

    // Veo 3/3.1 audio generation
    if (model.supportsAudio && args.generateAudio !== undefined) {
      params.generate_audio = args.generateAudio;
    }

    // Veo 3/3.1 enhance prompt
    if (model.supportsEnhancePrompt && args.enhancePrompt !== undefined) {
      params.enhance_prompt = args.enhancePrompt;
    }

    // CFG scale (Wan, Kling, Hunyuan)
    if (model.supportsCfgScale && args.cfgScale !== undefined) {
      params.cfg_scale = args.cfgScale;
    }

    // Seed for reproducibility
    if (args.seed !== undefined) {
      params.seed = args.seed;
    }

    // Avatar model params
    if (model.type === "avatar" && args.avatarId) {
      params.avatar_id = args.avatarId;
    }

    // Voice preset (stored as metadata for user reference)
    if (args.voicePresetId) {
      params.voice_preset_id = args.voicePresetId;
    }

    const requestId = await submitGeneration(apiKey, model.endpoint, params);

    await context.entities.VideoGeneration.update({
      where: { id: generation.id },
      data: { requestId, status: "processing" },
    });

    return { ...generation, requestId, status: "processing" };
  } catch (err: any) {
    // Submission failed — refund credits and mark as failed
    await refundCredits(
      context.entities as any,
      context.user.id,
      creditAction,
      `fal.ai submission failed: ${err.message}`,
    );

    await context.entities.VideoGeneration.update({
      where: { id: generation.id },
      data: {
        status: "failed",
        errorMessage: err.message || "Failed to submit to fal.ai",
      },
    });

    throw new HttpError(502, `Failed to submit generation: ${err.message}`);
  }
};

// ---------------------------------------------------------------------------
// checkVideoStatus — manual status check
// ---------------------------------------------------------------------------

export const checkVideoStatus: CheckVideoStatus<
  { id: string },
  any
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const gen = await context.entities.VideoGeneration.findUnique({
    where: { id: args.id },
  });
  if (!gen || gen.userId !== context.user.id) {
    throw new HttpError(404, "Generation not found");
  }

  if (!gen.requestId) {
    throw new HttpError(400, "No request ID — generation was never submitted");
  }

  if (gen.status === "completed" || gen.status === "failed") {
    return gen;
  }

  const apiKey = await getFalApiKey(context.entities.Setting);
  const statusResult = await checkStatus(apiKey, gen.modelEndpoint, gen.requestId);

  if (statusResult.status === "COMPLETED") {
    const result = await getResult(apiKey, gen.modelEndpoint, gen.requestId);
    return context.entities.VideoGeneration.update({
      where: { id: gen.id },
      data: {
        status: "completed",
        progress: 100,
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
      },
    });
  }

  if (statusResult.status === "FAILED") {
    // Refund credits on failure
    const creditAction = getCreditAction(
      getModelByKey(gen.model)?.tier || "budget",
    );
    await refundCredits(
      context.entities as any,
      context.user.id,
      creditAction,
      "Video generation failed on fal.ai",
    );

    return context.entities.VideoGeneration.update({
      where: { id: gen.id },
      data: {
        status: "failed",
        errorMessage: "Generation failed on fal.ai",
      },
    });
  }

  // Still processing
  return context.entities.VideoGeneration.update({
    where: { id: gen.id },
    data: { progress: statusResult.progress },
  });
};

// ---------------------------------------------------------------------------
// retryVideoGeneration — re-submit a failed generation
// ---------------------------------------------------------------------------

export const retryVideoGeneration: RetryVideoGeneration<
  { id: string },
  any
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const gen = await context.entities.VideoGeneration.findUnique({
    where: { id: args.id },
  });
  if (!gen || gen.userId !== context.user.id) {
    throw new HttpError(404, "Generation not found");
  }
  if (gen.status !== "failed") {
    throw new HttpError(400, "Only failed generations can be retried");
  }

  const model = getModelByKey(gen.model);
  if (!model) throw new HttpError(400, "Model no longer available");

  const creditAction = getCreditAction(model.tier);
  const creditCost = CREDIT_COSTS[creditAction];

  // Deduct credits for retry
  await deductCredits(
    prisma,
    context.user.id,
    creditAction,
    { modelKey: gen.model, retry: true },
  );

  try {
    const apiKey = await getFalApiKey(context.entities.Setting);

    const params: Record<string, unknown> = { prompt: gen.prompt };
    if (gen.negativePrompt) params.negative_prompt = gen.negativePrompt;
    if (gen.duration) params.duration = gen.duration;
    if (gen.aspectRatio) params.aspect_ratio = gen.aspectRatio;
    if (gen.inputImageUrl) params.image_url = gen.inputImageUrl;
    if (gen.inputVideoUrl) params.video_url = gen.inputVideoUrl;

    // Re-apply stored metadata params
    if (gen.metadata) {
      const meta = gen.metadata as Record<string, any>;
      if (meta.enhance_prompt !== undefined) params.enhance_prompt = meta.enhance_prompt;
      if (meta.generate_audio !== undefined) params.generate_audio = meta.generate_audio;
      if (meta.seed !== undefined) params.seed = meta.seed;
      if (meta.cfg_scale !== undefined) params.cfg_scale = meta.cfg_scale;
      if (meta.avatar_id) params.avatar_id = meta.avatar_id;
      if (meta.voice_preset_id) params.voice_preset_id = meta.voice_preset_id;
      if (meta.reference_image_urls) params.reference_image_urls = meta.reference_image_urls;
      if (meta.first_frame_image_url) params.first_frame_image_url = meta.first_frame_image_url;
      if (meta.last_frame_image_url) params.last_frame_image_url = meta.last_frame_image_url;
    }

    const requestId = await submitGeneration(apiKey, model.endpoint, params);

    return context.entities.VideoGeneration.update({
      where: { id: gen.id },
      data: {
        requestId,
        status: "processing",
        progress: 0,
        errorMessage: null,
        videoUrl: null,
        thumbnailUrl: null,
        creditsCost: gen.creditsCost + creditCost,
      },
    });
  } catch (err: any) {
    await refundCredits(
      context.entities as any,
      context.user.id,
      creditAction,
      `Retry submission failed: ${err.message}`,
    );
    throw new HttpError(502, `Failed to retry: ${err.message}`);
  }
};

// ---------------------------------------------------------------------------
// deleteVideoGeneration
// ---------------------------------------------------------------------------

export const deleteVideoGeneration: DeleteVideoGeneration<
  { id: string },
  void
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const gen = await context.entities.VideoGeneration.findUnique({
    where: { id: args.id },
  });
  if (!gen || gen.userId !== context.user.id) {
    throw new HttpError(404, "Generation not found");
  }

  await context.entities.VideoGeneration.delete({ where: { id: args.id } });
};

// ---------------------------------------------------------------------------
// Improve Prompt via prompts.chat API
// ---------------------------------------------------------------------------

const PROMPTS_CHAT_API_KEY =
  "pchat_626f7de4db37fce6eb24680d6b69d71a1c96a5daf9fe07de5012d21ce22f384f";

export const improveVideoPrompt: ImproveVideoPrompt<
  { prompt: string },
  { improved: string }
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  if (!args.prompt || args.prompt.trim().length < 5) {
    throw new HttpError(400, "Prompt must be at least 5 characters");
  }

  // Deduct credits before calling the API
  await deductCredits(
    prisma,
    context.user.id,
    CreditActionType.PromptEnhance,
  );

  const res = await fetch("https://prompts.chat/api/improve-prompt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": PROMPTS_CHAT_API_KEY,
    },
    body: JSON.stringify({
      prompt: args.prompt,
      outputType: "text",
      outputFormat: "text",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new HttpError(502, `Prompt improvement failed: ${errText}`);
  }

  const data = await res.json();
  return { improved: data.improved || args.prompt };
};
