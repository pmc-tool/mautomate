import { HttpError, prisma } from "wasp/server";
import {
  CreditActionType,
} from "../../credits/creditConfig";
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
  setVideoModel,
} from "./novitaVideoClient";
import {
  stitchStoryVideo as runStitch,
  cleanupTempDir,
  extractReferenceFrame,
} from "./stitchingService";
import { STORY_VIDEOS_DIR } from "../../server/setup";
import fsPromises from "fs/promises";
import path from "path";

const EXTENSION_ID = "long-story-video";
const LOG = "[generationOperations]";

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
  const setting = await settingEntity.findUnique({ where: { key } });
  if (!setting || !setting.value) {
    throw new HttpError(
      500,
      `Missing required setting: "${key}". Please configure it in admin settings.`
    );
  }
  return setting.value;
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
      openaiApiKey,
      project.referenceImageUrl || undefined
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
  for (const scene of args.scenes) {
    if (!scene.visualPrompt || scene.visualPrompt.trim().length < 10) {
      throw new HttpError(400, `Scene ${scene.sceneIndex}: visualPrompt must be at least 10 characters.`);
    }
    if (!scene.narrationText || scene.narrationText.trim().length < 10) {
      throw new HttpError(400, `Scene ${scene.sceneIndex}: narrationText must be at least 10 characters.`);
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
// 3. startStoryGeneration
// ---------------------------------------------------------------------------

export const startStoryGeneration = async (
  args: {
    projectId: string;
    voiceId: string;
    musicTrackId?: string;
    resolution: "720p" | "1080p";
    subtitlesEnabled?: boolean;
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

  // Idempotency: prevent double-click double-charge
  const alreadyGenerating = project.scenes.some((s: any) => s.status === "generating");
  if (alreadyGenerating) {
    throw new HttpError(409, "Generation is already in progress for this project.");
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

  // Determine credit action based on scene count
  const creditAction =
    sceneCount <= 8 ? CreditActionType.StoryBasic : CreditActionType.StoryStandard;

  // Get Novita API key
  const novitaApiKey = await getSettingValue(
    context.entities.Setting,
    "ext.long-story-video.novita_api_key"
  );

  // Load video model setting (default: wan2.1 for cost savings)
  try {
    const modelSetting = await context.entities.Setting.findUnique({
      where: { key: "ext.long-story-video.video_model" },
    });
    if (modelSetting?.value) setVideoModel(modelSetting.value);
  } catch {}

  // Deduct credits upfront
  console.log(`${LOG} startStoryGeneration: deducting credits for user ${context.user.id}, action=${creditAction}, sceneCount=${sceneCount}`);
  try {
    await deductCredits(
      prisma,
      context.user.id,
      creditAction,
      { projectId: args.projectId, sceneCount }
    );
  } catch (err: any) {
    console.error(`${LOG} startStoryGeneration: deductCredits failed:`, err.message, err.statusCode || err.code);
    throw err;
  }

  // Update project settings
  await context.entities.StoryProject.update({
    where: { id: args.projectId },
    data: {
      voiceId: args.voiceId,
      musicTrackId: args.musicTrackId || null,
      resolution: args.resolution,
      status: "generating",
      totalCredits: creditAction === CreditActionType.StoryBasic ? 150 : 300,
      metadata: { subtitlesEnabled: args.subtitlesEnabled ?? false },
      errorMessage: null,
    },
  });

  // Submit first scene (index 0)
  const firstScene = project.scenes.find((s: any) => s.sceneIndex === 0);
  if (!firstScene) {
    throw new HttpError(500, "First scene (index 0) not found.");
  }

  const size = resolutionToSize(args.resolution, "16:9");

  let submitResult;
  if (project.referenceImageUrl) {
    // Use image-to-video for the first scene if reference image is provided
    submitResult = await submitI2V(novitaApiKey, {
      prompt: firstScene.visualPrompt,
      duration: firstScene.duration as 5 | 10 | 15,
      size,
      shot_type: firstScene.shotType,
      image_url: project.referenceImageUrl,
    });
  } else {
    submitResult = await submitT2V(novitaApiKey, {
      prompt: firstScene.visualPrompt,
      duration: firstScene.duration as 5 | 10 | 15,
      size,
      shot_type: firstScene.shotType,
    });
  }

  // Update first scene with task ID
  await context.entities.StoryScene.update({
    where: { id: firstScene.id },
    data: {
      status: "generating",
      taskId: submitResult.task_id,
    },
  });

  console.log(
    `${LOG} Story generation started for project ${args.projectId}: scene 0 submitted as task ${submitResult.task_id}`
  );

  // Return updated project
  return context.entities.StoryProject.findUnique({
    where: { id: args.projectId },
    include: { scenes: { orderBy: { sceneIndex: "asc" } } },
  });
};

// ---------------------------------------------------------------------------
// 4. regenerateScene
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

  // Deduct credits for scene regeneration
  await deductCredits(
    prisma,
    context.user.id,
    CreditActionType.StorySceneRegen,
    { sceneId: args.sceneId, projectId: scene.projectId }
  );

  // Get Novita API key
  const novitaApiKey = await getSettingValue(
    context.entities.Setting,
    "ext.long-story-video.novita_api_key"
  );

  const size = resolutionToSize(
    (scene.project.resolution || "720p") as "720p" | "1080p",
    "16:9"
  );

  // Use T2V for all scenes (I2V requires image URL, not video URL)
  const submitResult = await submitT2V(novitaApiKey, {
    prompt: scene.visualPrompt,
    duration: scene.duration as 5 | 10 | 15,
    size,
    shot_type: scene.shotType,
  });

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

  // Prepare scenes for narration — skip scenes that already have narration
  const scenesForNarration = project.scenes
    .filter((s: any) => !s.narrationUrl)
    .map((s: any) => ({
      id: s.id,
      narrationText: s.narrationText,
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
// 6. stitchStoryVideo — FFmpeg stitching pipeline
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

  // Mark as stitching
  await context.entities.StoryProject.update({
    where: { id: args.projectId },
    data: { status: "stitching", errorMessage: null },
  });

  try {
    const subtitlesEnabled = (project.metadata as any)?.subtitlesEnabled ?? false;

    const result = await runStitch({
      projectId: args.projectId,
      scenes: project.scenes.map((s: any) => ({
        sceneIndex: s.sceneIndex,
        videoUrl: s.videoUrl,
        narrationUrl: s.narrationUrl,
        narrationText: s.narrationText,
        duration: s.duration,
      })),
      musicTrackId: project.musicTrackId || undefined,
      musicMood: project.musicMood || undefined,
      subtitlesEnabled,
      resolution: (project.resolution || "720p") as "720p" | "1080p",
    });

    // Copy final video to persistent serving directory
    const destPath = path.join(STORY_VIDEOS_DIR, `${args.projectId}.mp4`);
    await fsPromises.mkdir(STORY_VIDEOS_DIR, { recursive: true });
    await fsPromises.copyFile(result.finalVideoPath, destPath);
    console.log(`${LOG} Final video saved to: ${destPath}`);

    // Build serving URL (relative path — served by Express middleware)
    const finalVideoUrl = `/api/story-video/${args.projectId}.mp4`;

    // Clean up temp files
    const workDir = result.finalVideoPath.replace(/\/final\.mp4$/, "");
    await cleanupTempDir(workDir);

    const updated = await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: {
        status: "completed",
        finalVideoUrl,
      },
      include: { scenes: { orderBy: { sceneIndex: "asc" } } },
    });

    console.log(
      `${LOG} Video stitching complete for project ${args.projectId} (${result.durationSec}s)`
    );

    return updated;
  } catch (err: any) {
    console.error(`${LOG} Stitching failed for project ${args.projectId}:`, err.message);

    // Set to "narrated" so user can retry the Finalize button
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: {
        status: "narrated",
        errorMessage: `Video stitching failed: ${err.message?.substring(0, 200)}. Click "Finalize Video" to retry.`,
      },
    });

    throw new HttpError(500, `Video stitching failed: ${err.message}`);
  }
};

// ---------------------------------------------------------------------------
// 7. checkStoryStatus
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

  if (project.status !== "generating") {
    // Nothing to poll if not actively generating
    return project;
  }

  const novitaApiKey = await getSettingValue(
    context.entities.Setting,
    "ext.long-story-video.novita_api_key"
  );

  // Load video model setting
  try {
    const modelSetting = await context.entities.Setting.findUnique({
      where: { key: "ext.long-story-video.video_model" },
    });
    if (modelSetting?.value) setVideoModel(modelSetting.value);
  } catch {}

  const size = resolutionToSize(
    (project.resolution || "720p") as "720p" | "1080p",
    "16:9"
  );

  // Poll each scene that is currently generating
  const generatingScenes = project.scenes.filter(
    (s: any) => s.status === "generating" && s.taskId
  );

  // Recovery: if no scenes are generating but project is still "generating",
  // find the next pending scene and submit it using the last completed scene's video
  if (generatingScenes.length === 0) {
    const completedScenes = project.scenes
      .filter((s: any) => s.status === "completed" && s.videoUrl)
      .sort((a: any, b: any) => b.sceneIndex - a.sceneIndex);
    const nextPending = project.scenes
      .filter((s: any) => s.status === "pending")
      .sort((a: any, b: any) => a.sceneIndex - b.sceneIndex)[0];

    if (nextPending && completedScenes.length > 0) {
      console.log(`${LOG} Recovery: submitting stuck pending scene ${nextPending.sceneIndex} via T2V`);
      try {
        const recoveryResult = await submitT2V(novitaApiKey, {
          prompt: nextPending.visualPrompt,
          duration: nextPending.duration as 5 | 10 | 15,
          size,
          shot_type: nextPending.shotType,
        });
        await context.entities.StoryScene.update({
          where: { id: nextPending.id },
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
        } else {
          console.error(`${LOG} Recovery submit failed (will retry):`, submitErr.message);
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
        // Scene completed
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

        // Extract reference frame from scene 0 for character consistency
        if (scene.sceneIndex === 0 && result.videoUrl && !project.referenceImageUrl) {
          try {
            const refImagePath = path.join(STORY_VIDEOS_DIR, `${args.projectId}.jpg`);
            await fsPromises.mkdir(STORY_VIDEOS_DIR, { recursive: true });
            await extractReferenceFrame(result.videoUrl, refImagePath, 2);
            const refImageUrl = `/api/story-video/${args.projectId}.jpg`;
            await context.entities.StoryProject.update({
              where: { id: args.projectId },
              data: { referenceImageUrl: refImageUrl },
            });
            project.referenceImageUrl = refImageUrl;
            console.log(`${LOG} Reference frame extracted for project ${args.projectId}: ${refImageUrl}`);
          } catch (refErr: any) {
            console.warn(`${LOG} Failed to extract reference frame (will use T2V): ${refErr.message}`);
          }
        }

        // Submit next scene if available
        const nextScene = project.scenes.find(
          (s: any) => s.sceneIndex === scene.sceneIndex + 1 && s.status === "pending"
        );

        if (nextScene) {
          let nextSubmitResult;

          // Use I2V with reference image for character consistency (scenes 1+)
          const publicRefUrl = project.referenceImageUrl
            ? `https://mautomate.ai${project.referenceImageUrl}`
            : null;

          if (publicRefUrl) {
            try {
              console.log(`${LOG} Using I2V with reference image for scene ${nextScene.sceneIndex}`);
              nextSubmitResult = await submitI2V(novitaApiKey, {
                prompt: nextScene.visualPrompt,
                duration: nextScene.duration as 5 | 10 | 15,
                size,
                shot_type: nextScene.shotType,
                image_url: publicRefUrl,
              });
            } catch (i2vErr: any) {
              console.warn(`${LOG} I2V failed, falling back to T2V: ${i2vErr.message}`);
              nextSubmitResult = await submitT2V(novitaApiKey, {
                prompt: nextScene.visualPrompt,
                duration: nextScene.duration as 5 | 10 | 15,
                size,
                shot_type: nextScene.shotType,
              });
            }
          } else {
            nextSubmitResult = await submitT2V(novitaApiKey, {
              prompt: nextScene.visualPrompt,
              duration: nextScene.duration as 5 | 10 | 15,
              size,
              shot_type: nextScene.shotType,
            });
          }

          await context.entities.StoryScene.update({
            where: { id: nextScene.id },
            data: {
              status: "generating",
              taskId: nextSubmitResult.task_id,
            },
          });

          console.log(
            `${LOG} Next scene ${nextScene.id} (index ${nextScene.sceneIndex}) submitted as task ${nextSubmitResult.task_id}`
          );
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
    await context.entities.StoryProject.update({
      where: { id: args.projectId },
      data: { status: "narrating" },
    });
    updatedProject.status = "narrating";
    console.log(
      `${LOG} All scenes completed for project ${args.projectId} — status → narrating`
    );

    // Auto-trigger narration generation (fire-and-forget)
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
        const scenesForNarration = updatedProject.scenes
          .filter((s: any) => !s.narrationUrl)
          .map((s: any) => ({ id: s.id, narrationText: s.narrationText }));
        if (scenesForNarration.length === 0) {
          await context.entities.StoryProject.update({
            where: { id: args.projectId },
            data: { status: "narrated", errorMessage: null },
          });
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
        await context.entities.StoryProject.update({
          where: { id: args.projectId },
          data: {
            status: allNarrated ? "narrated" : "generated",
            errorMessage: allNarrated ? null : `Narration partially failed. Click "Generate Narration" to retry.`,
          },
        });
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
        progress: Math.round(totalProgress / updatedProject.scenes.length),
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
        progress: Math.round(totalProgress / updatedProject.scenes.length),
      },
    });
  }

  return context.entities.StoryProject.findUnique({
    where: { id: args.projectId },
    include: { scenes: { orderBy: { sceneIndex: "asc" } } },
  });
};
