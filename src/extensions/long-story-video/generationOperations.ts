import { HttpError, prisma } from "wasp/server";
import {
  CreditActionType,
  CREDIT_COSTS,
  getQualityTier,
  getStoryCreditAction,
} from "../../credits/creditConfig";
import type { StoryQuality } from "../../credits/creditConfig";
import {
  deductCredits,
  refundCredits,
} from "../../credits/creditService";
import {
  generateStoryPlan as planStory,
} from "./storyPlannerService";
import {
  generateAllNarrations,
} from "./ttsService";
import { isValidVoiceId } from "./ttsService";
import {
  submitT2V,
  submitI2V,
  checkStatus,
  resolutionToSize,
} from "./novitaVideoClient";
import {
  stitchStoryVideo as runStitch,
  cleanupTempDir,
} from "./stitchingService";
import { STORY_VIDEOS_DIR } from "../../server/setup";
import { getSecureSetting } from "../../server/settingEncryption";
import crypto from "crypto";
import fsPromises from "fs/promises";
import path from "path";

const EXTENSION_ID = "long-story-video";
const LOG = "[generationOperations]";
const MAX_PARALLEL_SCENES = 3;
const WORDS_PER_SEC = 2.5;

/**
 * Trims narration text to fit within the actual video duration at natural speech rate.
 */
function trimNarrationToFit(narrationText: string, videoDuration: number): string {
  if (!narrationText || !narrationText.trim()) return narrationText;
  if (videoDuration <= 0) return narrationText;
  const words = narrationText.trim().split(/\s+/);
  const maxWords = Math.floor(videoDuration * WORDS_PER_SEC);
  if (words.length <= maxWords) return narrationText;
  const trimmed = words.slice(0, maxWords);
  for (let i = trimmed.length - 1; i >= Math.floor(maxWords * 0.7); i--) {
    if (/[.!?]$/.test(trimmed[i])) {
      console.log(`${LOG} Trimmed narration from ${words.length} → ${i + 1} words to fit ${videoDuration}s video`);
      return trimmed.slice(0, i + 1).join(" ");
    }
  }
  console.log(`${LOG} Trimmed narration from ${words.length} → ${maxWords} words to fit ${videoDuration}s video`);
  return trimmed.join(" ");
}

// ---------------------------------------------------------------------------
// Extension guard
// ---------------------------------------------------------------------------

async function ensureExtensionActive(
  userExtensionEntity: any,
  userId: string
) {
  const ue = await userExtensionEntity.findUnique({
    where: { userId_extensionId: { userId, extensionId: EXTENSION_ID } },
  });
  if (!ue || !ue.isActive) {
    throw new HttpError(403, "Long Story Video extension is not active.");
  }
}

// ---------------------------------------------------------------------------
// Helper: get a Setting value by key
// ---------------------------------------------------------------------------

async function getSettingValue(
  settingEntity: any,
  key: string
): Promise<string> {
  const value = await getSecureSetting(settingEntity, key);
  if (!value) {
    throw new HttpError(
      500,
      `Missing required setting: "${key}". Please configure it in admin settings.`
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Helper: get project with ownership check
// ---------------------------------------------------------------------------

async function getOwnedProject(
  projectEntity: any,
  projectId: string,
  userId: string,
  includeScenes = true
) {
  const project = await projectEntity.findUnique({
    where: { id: projectId },
    include: includeScenes
      ? { scenes: { orderBy: { sceneIndex: "asc" } } }
      : undefined,
  });
  if (!project || project.userId !== userId) {
    throw new HttpError(404, "Story project not found.");
  }
  return project;
}

// ---------------------------------------------------------------------------
// Helper: Fire-and-forget stitching pipeline
// ---------------------------------------------------------------------------

async function runStitchingPipeline(
  projectId: string,
  project: any,
  context: any
): Promise<void> {
  const subtitlesEnabled = (project.metadata as any)?.subtitlesEnabled ?? false;
  const qualityTier = getQualityTier((project.quality || "low") as StoryQuality);

  // Get OpenAI API key for Whisper subtitle alignment
  let openaiApiKey: string | undefined;
  try {
    openaiApiKey = await getSecureSetting(context.entities.Setting, "platform.openai_api_key") || undefined;
  } catch {
    // Not critical — will fall back to proportional subtitles
  }

  // Fetch fresh scenes for stitching
  const freshScenes = await context.entities.StoryScene.findMany({
    where: { projectId },
    orderBy: { sceneIndex: "asc" },
  });

  try {
    const result = await runStitch({
      projectId,
      scenes: freshScenes.map((s: any) => ({
        sceneIndex: s.sceneIndex,
        videoUrl: s.videoUrl,
        narrationUrl: s.narrationUrl,
        narrationText: s.narrationText,
        duration: s.duration,
      })),
      musicTrackId: project.musicTrackId || undefined,
      musicMood: project.musicMood || undefined,
      subtitlesEnabled,
      resolution: qualityTier.resolution as "720p" | "1080p",
      openaiApiKey,
    });

    // Copy final video to persistent serving directory
    const destPath = path.join(STORY_VIDEOS_DIR, `${projectId}.mp4`);
    await fsPromises.mkdir(STORY_VIDEOS_DIR, { recursive: true });
    await fsPromises.copyFile(result.finalVideoPath, destPath);
    console.log(`${LOG} Final video saved to: ${destPath}`);

    // Clean up temp files
    const workDir = result.finalVideoPath.replace(/\/final\.mp4$/, "");
    await cleanupTempDir(workDir);

    const downloadToken = crypto.randomBytes(32).toString("hex");
    const finalVideoUrl = `/api/story-video/${projectId}.mp4?token=${downloadToken}`;

    // Fetch fresh metadata to avoid overwriting concurrent updates
    const freshProject = await context.entities.StoryProject.findUnique({
      where: { id: projectId },
      select: { metadata: true },
    });
    const freshMeta = (freshProject?.metadata as Record<string, unknown>) || {};
    const updatedMeta = { ...freshMeta, downloadToken };

    // Atomic guard: only mark completed if still stitching (prevents race with stuck recovery)
    const completed = await context.entities.StoryProject.updateMany({
      where: { id: projectId, status: "stitching" },
      data: {
        status: "completed",
        finalVideoUrl,
        metadata: updatedMeta,
      },
    });

    if (completed.count > 0) {
      console.log(`${LOG} Video stitching complete for project ${projectId} (${result.durationSec}s)`);
    } else {
      console.warn(`${LOG} Stitch finished but project ${projectId} is no longer in stitching status`);
    }
  } catch (err: any) {
    console.error(`${LOG} Stitching failed for project ${projectId}:`, err.message);
    // Atomic guard: only reset to narrated if still stitching
    await context.entities.StoryProject.updateMany({
      where: { id: projectId, status: "stitching" },
      data: {
        status: "narrated",
        errorMessage: `Video stitching failed: ${err.message?.substring(0, 200)}. Click "Finalize Video" to retry.`,
      },
    }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// 1. generateStoryPlan
// ---------------------------------------------------------------------------

export const generateStoryPlan = async (
  args: { projectId: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await getOwnedProject(
    context.entities.StoryProject,
    args.projectId,
    context.user.id
  );

  if (project.status !== "draft") {
    throw new HttpError(400, "Story plan can only be generated for projects in 'draft' status.");
  }

  if (!project.prompt || project.prompt.trim().length === 0) {
    throw new HttpError(400, "Project prompt cannot be empty.");
  }

  const openaiApiKey = await getSettingValue(
    context.entities.Setting,
    "platform.openai_api_key"
  );

  // Deduct credits for planning
  try {
    await deductCredits(
      prisma,
      context.user.id,
      CreditActionType.StoryPlan,
      { projectId: args.projectId }
    );
  } catch (err: any) {
    // Re-throw credit errors as-is (402)
    throw err;
  }

  try {
    // Generate story plan via OpenAI
    const plan = await planStory(
      project.prompt,
      project.targetDuration,
      openaiApiKey
    );

    // Create StoryScene records from plan
    const sceneCreateData = plan.scenes.map((scene) => ({
      projectId: args.projectId,
      sceneIndex: scene.sceneIndex,
      visualPrompt: scene.visualPrompt,
      narrationText: scene.narrationText,
      duration: scene.duration,
      shotType: scene.shotType,
      transitionNote: scene.transitionNote,
      status: "pending",
    }));

    // Delete any existing scenes (in case of retry)
    await context.entities.StoryScene.deleteMany({
      where: { projectId: args.projectId },
    });

    // Create all scenes
    for (const data of sceneCreateData) {
      await context.entities.StoryScene.create({ data });
    }

    // Update project with plan results + character description
    const existingMetadata = (project.metadata as any) || {};
    const updated = await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: {
        title: plan.title,
        musicMood: plan.musicMood,
        status: "planned",
        metadata: {
          ...existingMetadata,
          characterDescription: plan.characterDescription || "",
        },
      },
      include: { scenes: { orderBy: { sceneIndex: "asc" } } },
    });

    console.log(
      `${LOG} Story plan generated for project ${args.projectId}: "${plan.title}" — ${plan.scenes.length} scenes, character: ${(plan.characterDescription || "none").substring(0, 80)}`
    );

    return updated;
  } catch (err: any) {
    // Refund credits on failure
    console.error(`${LOG} Story plan generation failed, refunding credits:`, err.message);
    try {
      await refundCredits(
        prisma,
        context.user.id,
        CreditActionType.StoryPlan,
        `Story plan generation failed: ${err.message}`
      );
    } catch (refundErr: any) {
      console.error(`${LOG} Credit refund also failed:`, refundErr.message);
    }

    // Reset project status back to draft
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: { status: "draft", errorMessage: err.message },
    });

    throw new HttpError(500, `Story plan generation failed: ${err.message}`);
  }
};

// ---------------------------------------------------------------------------
// 2. updateStoryPlan
// ---------------------------------------------------------------------------

export const updateStoryPlan = async (
  args: {
    projectId: string;
    scenes: Array<{
      id?: string;
      sceneIndex: number;
      visualPrompt: string;
      narrationText: string;
      duration: number;
      shotType: "single" | "multi";
      transitionNote?: string;
    }>;
  },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await getOwnedProject(
    context.entities.StoryProject,
    args.projectId,
    context.user.id,
    false
  );

  if (project.status !== "planned") {
    throw new HttpError(400, "Story plan can only be updated when project is in 'planned' status.");
  }

  if (!args.scenes || args.scenes.length === 0) {
    throw new HttpError(400, "At least one scene is required.");
  }

  if (args.scenes.length > 20) {
    throw new HttpError(400, "A story can have at most 20 scenes.");
  }

  // Validate each scene has sufficient content
  const validDurations = [5, 10, 15];
  const validShotTypes = ["single", "multi"];
  for (const scene of args.scenes) {
    if (!scene.visualPrompt || scene.visualPrompt.trim().length < 10) {
      throw new HttpError(400, `Scene ${scene.sceneIndex}: visualPrompt must be at least 10 characters.`);
    }
    if (!scene.narrationText || scene.narrationText.trim().length < 10) {
      throw new HttpError(400, `Scene ${scene.sceneIndex}: narrationText must be at least 10 characters.`);
    }
    if (!validDurations.includes(scene.duration)) {
      throw new HttpError(400, `Scene ${scene.sceneIndex}: duration must be 5, 10, or 15 seconds.`);
    }
    if (!validShotTypes.includes(scene.shotType)) {
      throw new HttpError(400, `Scene ${scene.sceneIndex}: shotType must be 'single' or 'multi'.`);
    }
  }

  // Delete all existing scenes
  await context.entities.StoryScene.deleteMany({
    where: { projectId: args.projectId },
  });

  // Create new scenes from args
  for (const scene of args.scenes) {
    await context.entities.StoryScene.create({
      data: {
        projectId: args.projectId,
        sceneIndex: scene.sceneIndex,
        visualPrompt: scene.visualPrompt,
        narrationText: scene.narrationText,
        duration: scene.duration,
        shotType: scene.shotType,
        transitionNote: scene.transitionNote || "",
        status: "pending",
      },
    });
  }

  const updated = await context.entities.StoryProject.findUnique({
    where: { id: args.projectId },
    include: { scenes: { orderBy: { sceneIndex: "asc" } } },
  });

  console.log(
    `${LOG} Story plan updated for project ${args.projectId}: ${args.scenes.length} scenes`
  );

  return updated;
};

// ---------------------------------------------------------------------------
// 3. startStoryGeneration — now submits up to 3 scenes in parallel
// ---------------------------------------------------------------------------

export const startStoryGeneration = async (
  args: {
    projectId: string;
    voiceId: string;
    musicTrackId?: string;
    quality: "low" | "medium" | "high";
  },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await getOwnedProject(
    context.entities.StoryProject,
    args.projectId,
    context.user.id
  );

  if (project.status !== "planned") {
    throw new HttpError(400, "Generation can only start from 'planned' status.");
  }

  // Rate limit: max 3 concurrent generating/narrating/stitching projects per user
  const concurrentCount = await context.entities.StoryProject.count({
    where: {
      userId: context.user.id,
      status: { in: ["generating", "narrating", "stitching"] },
    },
  });
  if (concurrentCount >= 3) {
    throw new HttpError(429, "You can have at most 3 concurrent stories being processed. Please wait for one to finish.");
  }

  if (!isValidVoiceId(args.voiceId)) {
    throw new HttpError(400, `Invalid voice ID: "${args.voiceId}".`);
  }

  const sceneCount = project.scenes.length;
  if (sceneCount === 0) {
    throw new HttpError(400, "No scenes found. Generate a story plan first.");
  }

  // Atomic guard: transition planned → generating. Prevents double-click double-charge.
  const transitioned = await context.entities.StoryProject.updateMany({
    where: { id: args.projectId, status: "planned" },
    data: { status: "generating" },
  });
  if (transitioned.count === 0) {
    throw new HttpError(409, "Generation is already in progress for this project.");
  }

  // Validate quality input
  const validQualities = ["low", "medium", "high"];
  if (!validQualities.includes(args.quality)) {
    throw new HttpError(400, `Invalid quality "${args.quality}". Must be low, medium, or high.`);
  }

  // Derive model + resolution from quality tier
  const quality = args.quality || "low";
  const tier = getQualityTier(quality);
  const resolution = tier.resolution;
  const videoModel = tier.model;

  // Determine credit action based on quality + scene count
  const creditAction = getStoryCreditAction(quality, sceneCount);

  // Get Novita API key
  const novitaApiKey = await getSettingValue(
    context.entities.Setting,
    "ext.long-story-video.novita_api_key"
  );

  // Deduct credits upfront
  console.log(`${LOG} startStoryGeneration: deducting credits for user ${context.user.id}, action=${creditAction}, quality=${quality}, sceneCount=${sceneCount}`);
  try {
    await deductCredits(
      prisma,
      context.user.id,
      creditAction,
      { projectId: args.projectId, sceneCount, quality }
    );
  } catch (err: any) {
    console.error(`${LOG} startStoryGeneration: deductCredits failed:`, err.message, err.statusCode || err.code);
    throw err;
  }

  // Wrap remaining work in try-catch so we can refund credits on failure
  try {
    // Update project settings (status already set to "generating" by atomic guard above)
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: {
        voiceId: args.voiceId,
        musicTrackId: args.musicTrackId || null,
        resolution,
        quality,
        totalCredits: CREDIT_COSTS[creditAction],
        metadata: { ...((project.metadata as Record<string, unknown>) || {}), subtitlesEnabled: true },
        errorMessage: null,
      },
    });

    const size = resolutionToSize(resolution, "16:9");

    // Submit up to MAX_PARALLEL_SCENES scenes concurrently
    const pendingScenes = project.scenes
      .filter((s: any) => s.status === "pending")
      .sort((a: any, b: any) => a.sceneIndex - b.sceneIndex)
      .slice(0, MAX_PARALLEL_SCENES);

    for (const scene of pendingScenes) {
      let submitResult;

      // Use I2V only for the first scene if reference image exists
      if (scene.sceneIndex === 0 && project.referenceImageUrl) {
        submitResult = await submitI2V(novitaApiKey, {
          prompt: scene.visualPrompt,
          duration: scene.duration as 5 | 10 | 15,
          size,
          shot_type: scene.shotType,
          image_url: project.referenceImageUrl,
        }, videoModel);
      } else {
        submitResult = await submitT2V(novitaApiKey, {
          prompt: scene.visualPrompt,
          duration: scene.duration as 5 | 10 | 15,
          size,
          shot_type: scene.shotType,
        }, videoModel);
      }

      await context.entities.StoryScene.update({
        where: { id: scene.id },
        data: {
          status: "generating",
          taskId: submitResult.task_id,
        },
      });

      console.log(
        `${LOG} Scene ${scene.sceneIndex} submitted as task ${submitResult.task_id} (quality=${quality}, model=${videoModel})`
      );
    }

    console.log(
      `${LOG} Story generation started for project ${args.projectId}: ${pendingScenes.length} scene(s) submitted in parallel`
    );

    // Return updated project
    return context.entities.StoryProject.findUnique({
      where: { id: args.projectId },
      include: { scenes: { orderBy: { sceneIndex: "asc" } } },
    });
  } catch (err: any) {
    // Refund credits on failure
    try {
      await refundCredits(prisma, context.user.id, creditAction, `Generation failed to start: ${err.message}`);
      console.log(`${LOG} Refunded credits after generation start failure`);
    } catch (refundErr: any) {
      console.error(`${LOG} Failed to refund credits:`, refundErr.message);
    }
    throw err instanceof HttpError ? err : new HttpError(500, `Failed to start generation: ${err.message}`);
  }
};

// ---------------------------------------------------------------------------
// 4. regenerateScene — now supports completed scenes too
// ---------------------------------------------------------------------------

export const regenerateScene = async (
  args: { sceneId: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  // Find scene and verify project ownership
  const scene = await context.entities.StoryScene.findUnique({
    where: { id: args.sceneId },
    include: { project: true },
  });

  if (!scene || scene.project.userId !== context.user.id) {
    throw new HttpError(404, "Scene not found.");
  }

  // Allow regeneration of failed OR completed scenes
  if (!["failed", "completed"].includes(scene.status)) {
    throw new HttpError(400, "Only failed or completed scenes can be regenerated.");
  }

  // Deduct credits for scene regeneration
  await deductCredits(
    prisma,
    context.user.id,
    CreditActionType.StorySceneRegen,
    { sceneId: args.sceneId, projectId: scene.projectId }
  );

  // Get Novita API key
  let novitaApiKey: string;
  try {
    novitaApiKey = await getSettingValue(
      context.entities.Setting,
      "ext.long-story-video.novita_api_key"
    );
  } catch (apiKeyErr: any) {
    // Refund credits if we can't get the API key
    try {
      await refundCredits(prisma, context.user.id, CreditActionType.StorySceneRegen, `API key error: ${apiKeyErr.message}`);
    } catch {}
    throw apiKeyErr;
  }

  const qualityTier = getQualityTier((scene.project.quality || "low") as any);
  const size = resolutionToSize(qualityTier.resolution, "16:9");

  try {
    const submitResult = await submitT2V(novitaApiKey, {
      prompt: scene.visualPrompt,
      duration: scene.duration as 5 | 10 | 15,
      size,
      shot_type: scene.shotType,
    }, qualityTier.model);

    // Update scene
    const updated = await context.entities.StoryScene.update({
      where: { id: args.sceneId },
      data: {
        status: "generating",
        taskId: submitResult.task_id,
        videoUrl: null,
        errorMessage: null,
        progress: 0,
      },
    });

    console.log(
      `${LOG} Scene ${args.sceneId} regeneration submitted as task ${submitResult.task_id}`
    );

    return updated;
  } catch (submitErr: any) {
    // Refund credits on Novita submit failure
    try {
      await refundCredits(prisma, context.user.id, CreditActionType.StorySceneRegen, `Scene regen submit failed: ${submitErr.message}`);
      console.log(`${LOG} Refunded credits after scene regen submit failure`);
    } catch (refundErr: any) {
      console.error(`${LOG} Failed to refund credits after scene regen failure:`, refundErr.message);
    }
    throw new HttpError(500, `Failed to regenerate scene: ${submitErr.message}`);
  }
};

// ---------------------------------------------------------------------------
// 5. generateNarration
// ---------------------------------------------------------------------------

export const generateNarration = async (
  args: { projectId: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await getOwnedProject(
    context.entities.StoryProject,
    args.projectId,
    context.user.id
  );

  // Allow narration generation when project is in "narrating" status
  // or when all scenes are completed
  const allScenesCompleted = project.scenes.every(
    (s: any) => s.status === "completed"
  );

  if (project.status !== "narrating" && !allScenesCompleted) {
    throw new HttpError(
      400,
      "Narration can only be generated when project is in 'narrating' status or all scenes are completed."
    );
  }

  // Update status to narrating if not already
  if (project.status !== "narrating") {
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: { status: "narrating" },
    });
  }

  const novitaApiKey = await getSettingValue(
    context.entities.Setting,
    "ext.long-story-video.novita_api_key"
  );

  const voiceId = project.voiceId;
  if (!voiceId || !isValidVoiceId(voiceId)) {
    throw new HttpError(400, "Project does not have a valid voice ID configured.");
  }

  // Prepare scenes for narration — skip scenes that already have narration or empty text
  // Trim narration text to fit actual video duration (prevents atempo overflow)
  const scenesForNarration = project.scenes
    .filter((s: any) => !s.narrationUrl && s.narrationText?.trim())
    .map((s: any) => ({
      id: s.id,
      narrationText: trimNarrationToFit(s.narrationText, s.duration),
    }));

  if (scenesForNarration.length === 0) {
    // All scenes already have narration — just update status
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: { status: "narrated", errorMessage: null },
    });
    return context.entities.StoryProject.findUnique({
      where: { id: args.projectId },
      include: { scenes: { orderBy: { sceneIndex: "asc" } } },
    });
  }

  console.log(`${LOG} Generating narration for ${scenesForNarration.length} scene(s) (${project.scenes.length - scenesForNarration.length} already have narration)`);

  // Generate all narrations via Novita TTS
  let narrationResults: Map<string, string>;
  try {
    narrationResults = await generateAllNarrations(
      scenesForNarration,
      voiceId,
      novitaApiKey
    );
  } catch (err: any) {
    // Reset status so user can retry
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: { status: "generated", errorMessage: `Narration failed: ${err.message || "Unknown error"}` },
    });
    throw new HttpError(500, `Narration generation failed: ${err.message || "Unknown error"}`);
  }

  // Update each scene with its narration URL
  for (const [sceneId, audioUrl] of narrationResults.entries()) {
    await context.entities.StoryScene.update({
      where: { id: sceneId },
      data: { narrationUrl: audioUrl },
    });
  }

  // Check if all scenes now have narration
  const updatedScenes = await context.entities.StoryScene.findMany({
    where: { projectId: args.projectId },
    orderBy: { sceneIndex: "asc" },
  });

  const allHaveNarration = updatedScenes.every(
    (s: any) => s.narrationUrl != null
  );

  if (allHaveNarration) {
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: { status: "narrated", errorMessage: null },
    });
  } else {
    // Some scenes failed — reset status so user can retry
    const failedCount = scenesForNarration.length - narrationResults.size;
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: { status: "generated", errorMessage: `Narration partially failed: ${failedCount} scene(s) missing audio. Click "Generate Narration" to retry.` },
    });
  }

  console.log(
    `${LOG} Narration generated for project ${args.projectId}: ${narrationResults.size}/${scenesForNarration.length} scenes. All narrated: ${allHaveNarration}`
  );

  return context.entities.StoryProject.findUnique({
    where: { id: args.projectId },
    include: { scenes: { orderBy: { sceneIndex: "asc" } } },
  });
};

// ---------------------------------------------------------------------------
// 6. stitchStoryVideo — FFmpeg stitching pipeline (idempotent)
// ---------------------------------------------------------------------------

export const stitchStoryVideo = async (
  args: { projectId: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await getOwnedProject(
    context.entities.StoryProject,
    args.projectId,
    context.user.id
  );

  if (!["narrated", "stitching"].includes(project.status) &&
      !(project.scenes.every((s: any) => s.videoUrl && s.narrationUrl))) {
    throw new HttpError(400, "All scenes must have video and narration before stitching.");
  }

  // Verify all scenes have both video and narration
  const missingVideo = project.scenes.filter((s: any) => !s.videoUrl);
  const missingNarration = project.scenes.filter((s: any) => !s.narrationUrl);

  if (missingVideo.length > 0) {
    throw new HttpError(
      400,
      `${missingVideo.length} scene(s) are missing video. Complete generation first.`
    );
  }
  if (missingNarration.length > 0) {
    throw new HttpError(
      400,
      `${missingNarration.length} scene(s) are missing narration. Generate narration first.`
    );
  }

  // Idempotent guard: only transition to "stitching" if currently "narrated"
  // Prevents double-click from launching two FFmpeg processes
  const transitioned = await context.entities.StoryProject.updateMany({
    where: { id: args.projectId, status: "narrated" },
    data: { status: "stitching", errorMessage: null },
  });

  if (transitioned.count === 0) {
    // Already stitching or in another state — return current project
    console.log(`${LOG} Stitch request for ${args.projectId} ignored — not in 'narrated' status`);
    return project;
  }

  // Fire-and-forget: run stitching in background
  runStitchingPipeline(args.projectId, project, context).catch(() => {});

  // Return immediately — client polls via getStoryProject (refetchInterval: 4s)
  return project;
};

// ---------------------------------------------------------------------------
// 7. checkStoryStatus — with parallel scene submission
// ---------------------------------------------------------------------------

export const checkStoryStatus = async (
  args: { projectId: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await getOwnedProject(
    context.entities.StoryProject,
    args.projectId,
    context.user.id
  );

  // Fix: recover from stuck stitching state (>10 minutes)
  if (project.status === "stitching") {
    const stitchAge = Date.now() - new Date(project.updatedAt).getTime();
    if (stitchAge > 10 * 60 * 1000) { // 10 minutes
      console.warn(`${LOG} Project ${args.projectId} stuck in stitching for ${Math.round(stitchAge / 60000)}m — resetting to narrated`);
      await context.entities.StoryProject.update({
        where: { id: args.projectId },
        data: { status: "narrated", errorMessage: "Stitching timed out. Click Finalize Video to retry." },
      });
    }
    // Return current project state (client polls will pick up the change)
    return project;
  }

  if (project.status !== "generating") {
    // Nothing to poll if not actively generating
    return project;
  }

  const novitaApiKey = await getSettingValue(
    context.entities.Setting,
    "ext.long-story-video.novita_api_key"
  );

  // Derive model + resolution from project quality
  const projectQuality = (project.quality || "low") as any;
  const qualityTierInfo = getQualityTier(projectQuality);
  const videoModel = qualityTierInfo.model;

  const size = resolutionToSize(qualityTierInfo.resolution, "16:9");

  // Poll each scene that is currently generating
  const generatingScenes = project.scenes.filter(
    (s: any) => s.status === "generating" && s.taskId
  );

  // Recovery: if no scenes are generating but project is still "generating",
  // find the next pending scene and submit it
  if (generatingScenes.length === 0) {
    const completedScenes = project.scenes
      .filter((s: any) => s.status === "completed" && s.videoUrl)
      .sort((a: any, b: any) => b.sceneIndex - a.sceneIndex);
    const pendingScenes = project.scenes
      .filter((s: any) => s.status === "pending")
      .sort((a: any, b: any) => a.sceneIndex - b.sceneIndex);

    // Submit up to MAX_PARALLEL_SCENES pending scenes
    const toSubmit = pendingScenes.slice(0, MAX_PARALLEL_SCENES);

    if (toSubmit.length > 0 && completedScenes.length > 0) {
      for (const nextPending of toSubmit) {
        console.log(`${LOG} Recovery: submitting stuck pending scene ${nextPending.sceneIndex} via T2V`);
        try {
          const recoveryResult = await submitT2V(novitaApiKey, {
            prompt: nextPending.visualPrompt,
            duration: nextPending.duration as 5 | 10 | 15,
            size,
            shot_type: nextPending.shotType,
          }, videoModel);
          // Atomic guard: only update if still pending
          await context.entities.StoryScene.updateMany({
            where: { id: nextPending.id, status: "pending" },
            data: { status: "generating", taskId: recoveryResult.task_id, errorMessage: null },
          });
          console.log(`${LOG} Recovery: scene ${nextPending.sceneIndex} submitted as task ${recoveryResult.task_id}`);
        } catch (submitErr: any) {
          const isFatal = submitErr.message?.includes("NOT_ENOUGH_BALANCE") || submitErr.message?.includes("403");
          if (isFatal) {
            await context.entities.StoryProject.update({
              where: { id: args.projectId },
              data: { status: "failed", errorMessage: "Novita AI account has insufficient balance. Please top up at novita.ai and retry." },
            });
            console.error(`${LOG} Fatal: Novita balance exhausted for project ${args.projectId}`);
            break;
          } else {
            console.error(`${LOG} Recovery submit failed (will retry):`, submitErr.message);
          }
        }
      }
    }

    // Re-fetch project for updated state
    const updatedProject = await getOwnedProject(
      context.entities.StoryProject,
      args.projectId,
      context.user.id
    );
    return updatedProject;
  }

  for (const scene of generatingScenes) {
    try {
      const result = await checkStatus(novitaApiKey, scene.taskId);

      if (result.status === "completed" && result.videoUrl) {
        // Scene completed — duration probing is handled by the cron job (storyCheckJob)
        // to avoid blocking this user-facing endpoint (ffprobe on remote URL can take 20s)
        await context.entities.StoryScene.update({
          where: { id: scene.id },
          data: {
            status: "completed",
            progress: 100,
            videoUrl: result.videoUrl,
          },
        });

        console.log(
          `${LOG} Scene ${scene.id} (index ${scene.sceneIndex}) completed`
        );

        // Submit next pending scene(s) to maintain MAX_PARALLEL_SCENES in-flight
        const currentGenerating = project.scenes.filter(
          (s: any) => s.status === "generating" && s.id !== scene.id
        ).length;
        const slotsAvailable = MAX_PARALLEL_SCENES - currentGenerating;

        if (slotsAvailable > 0) {
          const nextPendingScenes = project.scenes
            .filter((s: any) => s.status === "pending")
            .sort((a: any, b: any) => a.sceneIndex - b.sceneIndex)
            .slice(0, slotsAvailable);

          for (const nextScene of nextPendingScenes) {
            // Atomic guard: only submit if still pending
            const freshNext = await context.entities.StoryScene.findUnique({ where: { id: nextScene.id } });
            if (!freshNext || freshNext.status !== "pending") {
              console.log(`${LOG} Scene ${nextScene.sceneIndex} already being processed, skipping`);
              continue;
            }

            try {
              console.log(`${LOG} Submitting T2V for scene ${nextScene.sceneIndex} (model=${videoModel})`);
              const nextSubmitResult = await submitT2V(novitaApiKey, {
                prompt: nextScene.visualPrompt,
                duration: nextScene.duration as 5 | 10 | 15,
                size,
                shot_type: nextScene.shotType,
              }, videoModel);

              await context.entities.StoryScene.updateMany({
                where: { id: nextScene.id, status: "pending" },
                data: {
                  status: "generating",
                  taskId: nextSubmitResult.task_id,
                },
              });

              console.log(
                `${LOG} Next scene ${nextScene.id} (index ${nextScene.sceneIndex}) submitted as task ${nextSubmitResult.task_id}`
              );
            } catch (submitErr: any) {
              console.error(`${LOG} Failed to submit scene ${nextScene.sceneIndex}:`, submitErr.message);
            }
          }
        }
      } else if (result.status === "failed") {
        // Scene failed
        await context.entities.StoryScene.update({
          where: { id: scene.id },
          data: {
            status: "failed",
            errorMessage: result.error || "Video generation failed",
          },
        });

        console.error(
          `${LOG} Scene ${scene.id} (index ${scene.sceneIndex}) failed: ${result.error}`
        );
      } else {
        // Still processing — update progress
        await context.entities.StoryScene.update({
          where: { id: scene.id },
          data: { progress: result.progress },
        });
      }
    } catch (err: any) {
      console.error(
        `${LOG} Error checking status for scene ${scene.id}:`,
        err.message
      );
    }
  }

  // Re-fetch to check overall status
  const updatedProject = await context.entities.StoryProject.findUnique({
    where: { id: args.projectId },
    include: { scenes: { orderBy: { sceneIndex: "asc" } } },
  });

  // Check if all scenes are now completed
  const allCompleted = updatedProject.scenes.every(
    (s: any) => s.status === "completed"
  );
  const anyFailed = updatedProject.scenes.some(
    (s: any) => s.status === "failed"
  );

  if (allCompleted) {
    // Atomic guard: only transition if still "generating" (prevents double narration with cron job)
    const transitioned = await context.entities.StoryProject.updateMany({
      where: { id: args.projectId, status: "generating" },
      data: { status: "narrating" },
    });
    if (transitioned.count === 0) {
      console.log(`${LOG} Project ${args.projectId} already transitioned — skipping narration trigger`);
      return context.entities.StoryProject.findUnique({
        where: { id: args.projectId },
        include: { scenes: { orderBy: { sceneIndex: "asc" } } },
      });
    }
    updatedProject.status = "narrating";
    console.log(
      `${LOG} All scenes completed for project ${args.projectId} — status → narrating`
    );

    // Auto-trigger narration generation (fire-and-forget)
    // After narration completes, auto-trigger stitching
    (async () => {
      try {
        const novitaApiKey = await getSettingValue(
          context.entities.Setting,
          "ext.long-story-video.novita_api_key"
        );
        const voiceId = updatedProject.voiceId;
        if (!voiceId || !isValidVoiceId(voiceId)) {
          console.error(`${LOG} Auto-narration: invalid voiceId "${voiceId}"`);
          return;
        }
        // Re-fetch scenes with updated durations from probing
        const freshScenesForNar = await context.entities.StoryScene.findMany({
          where: { projectId: args.projectId },
          orderBy: { sceneIndex: "asc" },
        });
        const scenesForNarration = freshScenesForNar
          .filter((s: any) => !s.narrationUrl && s.narrationText?.trim())
          .map((s: any) => ({
            id: s.id,
            narrationText: trimNarrationToFit(s.narrationText, s.duration),
          }));
        if (scenesForNarration.length === 0) {
          // All already narrated — skip to stitching
          const stitchTransitioned = await context.entities.StoryProject.updateMany({
            where: { id: args.projectId, status: "narrating" },
            data: { status: "narrated", errorMessage: null },
          });
          if (stitchTransitioned.count > 0) {
            // Auto-trigger stitching
            const stitchGuard = await context.entities.StoryProject.updateMany({
              where: { id: args.projectId, status: "narrated" },
              data: { status: "stitching", errorMessage: null },
            });
            if (stitchGuard.count > 0) {
              console.log(`${LOG} Auto-stitching: all scenes already narrated, starting stitch`);
              await runStitchingPipeline(args.projectId, updatedProject, context);
            }
          }
          return;
        }
        console.log(`${LOG} Auto-narration: generating ${scenesForNarration.length} scene(s)...`);
        const results = await generateAllNarrations(scenesForNarration, voiceId, novitaApiKey);
        for (const [sceneId, audioUrl] of results.entries()) {
          await context.entities.StoryScene.update({
            where: { id: sceneId },
            data: { narrationUrl: audioUrl },
          });
        }
        const allNarrated = results.size === scenesForNarration.length;
        if (allNarrated) {
          // Auto-trigger stitching after successful narration
          const stitchGuard = await context.entities.StoryProject.updateMany({
            where: { id: args.projectId, status: "narrating" },
            data: { status: "stitching", errorMessage: null },
          });
          if (stitchGuard.count > 0) {
            console.log(`${LOG} Auto-stitching: narration complete, starting stitch for project ${args.projectId}`);
            await runStitchingPipeline(args.projectId, updatedProject, context);
          } else {
            // Fallback: set to narrated so user can manually trigger
            await context.entities.StoryProject.update({
              where: { id: args.projectId },
              data: { status: "narrated", errorMessage: null },
            });
          }
        } else {
          await context.entities.StoryProject.update({
            where: { id: args.projectId },
            data: {
              status: "generated",
              errorMessage: `Narration partially failed. Click "Generate Narration" to retry.`,
            },
          });
        }
        console.log(`${LOG} Auto-narration complete: ${results.size}/${scenesForNarration.length} scenes`);
      } catch (err: any) {
        console.error(`${LOG} Auto-narration failed:`, err.message);
        await context.entities.StoryProject.update({
          where: { id: args.projectId },
          data: { status: "generated", errorMessage: `Narration failed: ${err.message}` },
        }).catch(() => {});
      }
    })();
  } else if (anyFailed) {
    // Calculate overall progress even with failures
    const totalProgress = updatedProject.scenes.reduce(
      (sum: number, s: any) => sum + (s.progress || 0),
      0
    );
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: {
        progress: updatedProject.scenes.length > 0 ? Math.round(totalProgress / updatedProject.scenes.length) : 0,
      },
    });
  } else {
    // Update overall progress
    const totalProgress = updatedProject.scenes.reduce(
      (sum: number, s: any) => sum + (s.progress || 0),
      0
    );
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: {
        progress: updatedProject.scenes.length > 0 ? Math.round(totalProgress / updatedProject.scenes.length) : 0,
      },
    });
  }

  return context.entities.StoryProject.findUnique({
    where: { id: args.projectId },
    include: { scenes: { orderBy: { sceneIndex: "asc" } } },
  });
};
