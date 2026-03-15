// ---------------------------------------------------------------------------
// PgBoss cron job: Poll Novita for processing story scenes
// Runs every minute. Submits up to 3 scenes concurrently per project.
// ---------------------------------------------------------------------------

import { prisma } from "wasp/server";
import {
  checkStatus,
  submitT2V,
  resolutionToSize,
} from "./novitaVideoClient";
import { CreditActionType, getQualityTier, getStoryCreditAction } from "../../credits/creditConfig";
import type { StoryQuality } from "../../credits/creditConfig";
import { refundCredits } from "../../credits/creditService";
import { getSecureSetting } from "../../server/settingEncryption";
import { generateAllNarrations, isValidVoiceId } from "./ttsService";
import {
  stitchStoryVideo as runStitch,
  cleanupTempDir,
  cleanupOrphanedTempDirs,
  probeRemoteVideoDuration,
} from "./stitchingService";
import { STORY_VIDEOS_DIR } from "../../server/setup";
import crypto from "crypto";
import fsPromises from "fs/promises";
import path from "path";

const LOG = "[storyCheckJob]";
const SCENE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WORDS_PER_SEC = 2.5; // average speech rate for narration
const MAX_ATEMPO = 1.5; // max speed-up allowed in stitching

/**
 * Trims narration text to fit within the actual video duration.
 * At 2.5 words/sec and up to 1.5x atempo, max words = duration × 2.5 × 1.5.
 * We target 1.0x speed (no atempo) so narration sounds natural.
 */
function trimNarrationToFit(narrationText: string, videoDuration: number): string {
  if (!narrationText || !narrationText.trim()) return narrationText;
  if (videoDuration <= 0) return narrationText; // edge case: should not happen with valid scenes
  const words = narrationText.trim().split(/\s+/);
  // Target word count at natural speed (no atempo needed)
  const maxWords = Math.floor(videoDuration * WORDS_PER_SEC);
  if (words.length <= maxWords) return narrationText;
  // Trim to fit, ending at a sentence boundary if possible
  const trimmed = words.slice(0, maxWords);
  // Try to end at a sentence boundary (., !, ?)
  for (let i = trimmed.length - 1; i >= Math.floor(maxWords * 0.7); i--) {
    if (/[.!?]$/.test(trimmed[i])) {
      console.log(`${LOG} Trimmed narration from ${words.length} → ${i + 1} words to fit ${videoDuration}s video`);
      return trimmed.slice(0, i + 1).join(" ");
    }
  }
  console.log(`${LOG} Trimmed narration from ${words.length} → ${maxWords} words to fit ${videoDuration}s video`);
  return trimmed.join(" ");
}
const PROJECT_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours — stop processing projects older than this
const MAX_SCENE_RETRIES = 2; // retry failed scenes up to 2 times
const MAX_PARALLEL_SCENES = 3;

// ---------------------------------------------------------------------------
// Helper: Fire-and-forget stitching pipeline (for cron-triggered auto-stitch)
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

    const destPath = path.join(STORY_VIDEOS_DIR, `${projectId}.mp4`);
    await fsPromises.mkdir(STORY_VIDEOS_DIR, { recursive: true });
    await fsPromises.copyFile(result.finalVideoPath, destPath);

    const downloadToken = crypto.randomBytes(32).toString("hex");
    const finalVideoUrl = `/api/story-video/${projectId}.mp4?token=${downloadToken}`;

    const workDir = result.finalVideoPath.replace(/\/final\.mp4$/, "");
    await cleanupTempDir(workDir);

    // Fetch fresh metadata to avoid overwriting concurrent updates
    const freshProject = await context.entities.StoryProject.findUnique({
      where: { id: projectId },
      select: { metadata: true },
    });
    const freshMeta = (freshProject?.metadata as Record<string, unknown>) || {};

    // Atomic guard: only mark completed if still stitching (prevents race with stuck recovery)
    const completed = await context.entities.StoryProject.updateMany({
      where: { id: projectId, status: "stitching" },
      data: {
        status: "completed",
        finalVideoUrl,
        metadata: { ...freshMeta, downloadToken },
      },
    });

    if (completed.count > 0) {
      console.log(`${LOG} Auto-stitch complete for project ${projectId} (${result.durationSec}s)`);
    } else {
      console.warn(`${LOG} Stitch finished but project ${projectId} no longer in stitching status`);
    }
  } catch (err: any) {
    console.error(`${LOG} Auto-stitch failed for project ${projectId}:`, err.message);
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

export const storyStatusCheck = async (_args: any, context: any) => {
  // ── Recovery: stuck "narrating" projects (>15 min) ──
  try {
    const stuckNarrating = await context.entities.StoryProject.findMany({
      where: { status: "narrating", updatedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } },
    });
    for (const proj of stuckNarrating) {
      console.warn(`${LOG} Project ${proj.id} stuck in narrating — resetting to generated`);
      await context.entities.StoryProject.update({
        where: { id: proj.id },
        data: { status: "generated", errorMessage: "Narration timed out. Click 'Generate Narration' to retry." },
      });
    }
  } catch (err: any) {
    console.error(`${LOG} Error checking stuck narrating projects:`, err.message);
  }

  // ── Recovery: stuck "stitching" projects (>10 min) ──
  try {
    const stuckStitching = await context.entities.StoryProject.findMany({
      where: { status: "stitching", updatedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
    });
    for (const proj of stuckStitching) {
      console.warn(`${LOG} Project ${proj.id} stuck in stitching — resetting to narrated`);
      await context.entities.StoryProject.update({
        where: { id: proj.id },
        data: { status: "narrated", errorMessage: "Stitching timed out. Click 'Finalize Video' to retry." },
      });
    }
  } catch (err: any) {
    console.error(`${LOG} Error checking stuck stitching projects:`, err.message);
  }

  // Find all scenes currently generating with a taskId
  const processingScenes = await context.entities.StoryScene.findMany({
    where: {
      status: "generating",
      taskId: { not: null },
    },
    include: { project: true },
  });

  // Recovery: find "generating" projects with no actively generating scenes (stuck state)
  if (processingScenes.length === 0) {
    const stuckProjects = await context.entities.StoryProject.findMany({
      where: { status: "generating" },
      include: { scenes: { orderBy: { sceneIndex: "asc" } } },
    });

    if (stuckProjects.length === 0) {
      // Clean up orphaned temp dirs at the end of the cron job
      await cleanupOrphanedTempDirs();
      return;
    }

    const apiKeyValue = await getSecureSetting(context.entities.Setting, "ext.long-story-video.novita_api_key");
    if (!apiKeyValue) {
      await cleanupOrphanedTempDirs();
      return;
    }

    for (const project of stuckProjects) {
      // Skip projects older than 2 hours — mark as failed
      const projectAge = Date.now() - new Date(project.createdAt).getTime();
      if (projectAge > PROJECT_MAX_AGE_MS) {
        console.warn(`${LOG} Project ${project.id} is ${Math.round(projectAge / 60000)}m old — marking as failed`);
        await context.entities.StoryProject.update({
          where: { id: project.id },
          data: { status: "failed", errorMessage: "Generation timed out. Please create a new story." },
        });
        // Refund credits for timed-out project
        try {
          const sceneCount = project.scenes.length;
          const creditAction = getStoryCreditAction((project.quality || "low") as StoryQuality, sceneCount);
          await refundCredits(prisma, project.userId, creditAction, `Project timed out after ${Math.round(projectAge / 60000)} minutes`);
          console.log(`${LOG} Refunded credits for timed-out project ${project.id}`);
        } catch (refundErr: any) {
          console.error(`${LOG} Failed to refund credits for timed-out project ${project.id}:`, refundErr.message);
        }
        continue;
      }

      const hasGenerating = project.scenes.some((s: any) => s.status === "generating");
      if (hasGenerating) {
        // Check for stuck scenes with null taskId (corrupted state)
        const nullTaskScenes = project.scenes.filter((s: any) => s.status === "generating" && !s.taskId);
        if (nullTaskScenes.length > 0) {
          for (const stuckScene of nullTaskScenes) {
            const stuckAge = Date.now() - new Date(stuckScene.updatedAt).getTime();
            if (stuckAge > 2 * 60 * 1000) { // 2 minutes with no taskId = definitely stuck
              console.warn(`${LOG} Scene ${stuckScene.sceneIndex} stuck generating with no taskId for ${Math.round(stuckAge / 60000)}m — marking failed`);
              await context.entities.StoryScene.update({
                where: { id: stuckScene.id },
                data: { status: "failed", errorMessage: "Scene stuck in generating state without task ID" },
              });
            }
          }
          continue; // Re-evaluate on next poll
        }
        continue; // not stuck
      }

      // Check if all scenes failed — mark project as failed
      const allFailed = project.scenes.every((s: any) => s.status === "failed");
      const allDone = project.scenes.every((s: any) => s.status === "completed" || s.status === "failed");
      if (allFailed) {
        await context.entities.StoryProject.update({
          where: { id: project.id },
          data: { status: "failed", errorMessage: "All scenes failed to generate." },
        });
        // Refund credits for projects where all scenes failed
        try {
          const sceneCount = project.scenes.length;
          const creditAction = getStoryCreditAction((project.quality || "low") as StoryQuality, sceneCount);
          await refundCredits(prisma, project.userId, creditAction, `All ${sceneCount} scenes failed to generate`);
          console.log(`${LOG} Refunded credits for all-failed project ${project.id}`);
        } catch (refundErr: any) {
          console.error(`${LOG} Failed to refund credits for all-failed project ${project.id}:`, refundErr.message);
        }
        console.warn(`${LOG} All scenes failed for project ${project.id} — marked as failed`);
        continue;
      }

      // Try to retry a failed scene (up to MAX_SCENE_RETRIES) or submit next pending
      const failedScene = project.scenes.find(
        (s: any) => s.status === "failed" && (s.retryCount || 0) < MAX_SCENE_RETRIES
      );
      const pendingScenes = project.scenes.filter((s: any) => s.status === "pending");
      const scenesToSubmit = pendingScenes.length > 0
        ? pendingScenes.slice(0, MAX_PARALLEL_SCENES)
        : failedScene ? [failedScene] : [];

      if (scenesToSubmit.length > 0) {
        const qualityTier = getQualityTier((project.quality || "low") as StoryQuality);
        const size = resolutionToSize(qualityTier.resolution, "16:9");

        for (const sceneToSubmit of scenesToSubmit) {
          try {
            const isRetry = sceneToSubmit.status === "failed";
            console.log(`${LOG} Recovery${isRetry ? " (retry)" : ""}: submitting scene ${sceneToSubmit.sceneIndex} for project ${project.id} (quality=${project.quality})`);
            const result = await submitT2V(apiKeyValue, {
              prompt: sceneToSubmit.visualPrompt,
              duration: sceneToSubmit.duration as 5 | 10 | 15,
              size,
              shot_type: sceneToSubmit.shotType,
            }, qualityTier.model);

            // Atomic guard: only update if still in expected state
            await context.entities.StoryScene.updateMany({
              where: { id: sceneToSubmit.id, status: sceneToSubmit.status },
              data: {
                status: "generating",
                taskId: result.task_id,
                errorMessage: null,
                retryCount: (sceneToSubmit.retryCount || 0) + (isRetry ? 1 : 0),
              },
            });
            console.log(`${LOG} Recovery: scene ${sceneToSubmit.sceneIndex} submitted as task ${result.task_id}`);
          } catch (err: any) {
            console.error(`${LOG} Recovery failed for scene ${sceneToSubmit.id}:`, err.message);
          }
        }
      } else if (allDone) {
        // Some completed, some failed with max retries — mark project failed
        const failedCount = project.scenes.filter((s: any) => s.status === "failed").length;
        await context.entities.StoryProject.update({
          where: { id: project.id },
          data: { status: "failed", errorMessage: `${failedCount} scene(s) failed after retries.` },
        });
      }
    }

    await cleanupOrphanedTempDirs();
    return;
  }

  console.log(
    `${LOG} Found ${processingScenes.length} processing scene(s) to poll`
  );

  // Group scenes by project to fetch API key once per project
  const scenesByProject = new Map<string, typeof processingScenes>();
  for (const scene of processingScenes) {
    const projectId = scene.projectId;
    if (!scenesByProject.has(projectId)) {
      scenesByProject.set(projectId, []);
    }
    scenesByProject.get(projectId)!.push(scene);
  }

  // Get the Novita API key (shared across all projects)
  const novitaApiKey = await getSecureSetting(context.entities.Setting, "ext.long-story-video.novita_api_key");

  if (!novitaApiKey) {
    console.error(
      `${LOG} Novita API key not configured (ext.long-story-video.novita_api_key). Skipping poll.`
    );
    return;
  }

  for (const [projectId, scenes] of scenesByProject.entries()) {
    const project = scenes[0].project;
    const qualityTier = getQualityTier((project.quality || "low") as StoryQuality);
    const size = resolutionToSize(qualityTier.resolution, "16:9");
    const videoModel = qualityTier.model;

    for (const scene of scenes) {
      try {
        // Timeout protection: if scene has been generating for > 15 minutes, mark failed
        const sceneAge = Date.now() - new Date(scene.updatedAt).getTime();
        if (sceneAge > SCENE_TIMEOUT_MS) {
          console.error(
            `${LOG} Scene ${scene.id} (index ${scene.sceneIndex}) timed out after ${Math.round(sceneAge / 60000)}m — marking as failed`
          );
          await context.entities.StoryScene.update({
            where: { id: scene.id },
            data: {
              status: "failed",
              errorMessage: "Generation timed out after 15 minutes",
            },
          });
          // No per-scene refund during initial generation — project-level timeout handles it
          continue;
        }

        const result = await checkStatus(novitaApiKey, scene.taskId);

        if (result.status === "completed" && result.videoUrl) {
          // ------ Scene completed ------
          // Probe actual video duration to fix planned vs actual mismatch
          const updateData: any = {
            status: "completed",
            progress: 100,
            videoUrl: result.videoUrl,
          };

          try {
            const actualDuration = await probeRemoteVideoDuration(result.videoUrl);
            if (actualDuration && Math.abs(actualDuration - scene.duration) > 1.0) {
              console.log(`${LOG} Scene ${scene.sceneIndex}: planned ${scene.duration}s but actual ${actualDuration}s — updating duration`);
              updateData.duration = actualDuration;
            }
          } catch (probeErr: any) {
            console.warn(`${LOG} Scene ${scene.sceneIndex}: duration probe failed, keeping planned ${scene.duration}s`);
          }

          await context.entities.StoryScene.update({
            where: { id: scene.id },
            data: updateData,
          });

          console.log(
            `${LOG} Scene ${scene.id} (project ${projectId}, index ${scene.sceneIndex}) completed`
          );

          // Submit next pending scenes to maintain MAX_PARALLEL_SCENES in-flight
          const allProjectScenesFresh = await context.entities.StoryScene.findMany({
            where: { projectId },
            orderBy: { sceneIndex: "asc" },
          });

          const currentlyGenerating = allProjectScenesFresh.filter(
            (s: any) => s.status === "generating"
          ).length;
          const slotsAvailable = MAX_PARALLEL_SCENES - currentlyGenerating;

          if (slotsAvailable > 0) {
            const nextPendingScenes = allProjectScenesFresh
              .filter((s: any) => s.status === "pending")
              .slice(0, slotsAvailable);

            for (const nextScene of nextPendingScenes) {
              try {
                console.log(`${LOG} Submitting T2V for scene ${nextScene.sceneIndex} (model=${videoModel})`);
                const submitResult = await submitT2V(novitaApiKey, {
                  prompt: nextScene.visualPrompt,
                  duration: nextScene.duration as 5 | 10 | 15,
                  size,
                  shot_type: nextScene.shotType,
                }, videoModel);

                // Atomic guard: only update if still pending (prevents race condition)
                const updated = await context.entities.StoryScene.updateMany({
                  where: { id: nextScene.id, status: "pending" },
                  data: {
                    status: "generating",
                    taskId: submitResult.task_id,
                  },
                });

                if (updated.count === 0) {
                  console.log(`${LOG} Scene ${nextScene.sceneIndex} was already claimed by another process`);
                } else {
                  console.log(
                    `${LOG} Next scene ${nextScene.id} (index ${nextScene.sceneIndex}) submitted as task ${submitResult.task_id}`
                  );
                }
              } catch (submitErr: any) {
                console.error(
                  `${LOG} Failed to submit next scene ${nextScene.id}:`,
                  submitErr.message
                );
                await context.entities.StoryScene.update({
                  where: { id: nextScene.id },
                  data: {
                    status: "failed",
                    errorMessage: `Failed to submit: ${submitErr.message}`,
                  },
                });
              }
            }
          }

          // Check if ALL scenes in this project are now complete
          const allProjectScenes = await context.entities.StoryScene.findMany({
            where: { projectId },
          });
          const allComplete = allProjectScenes.every(
            (s: any) => s.status === "completed"
          );

          if (allComplete) {
            // Atomic guard: only transition to "narrating" if still "generating"
            const transitioned = await context.entities.StoryProject.updateMany({
              where: { id: projectId, status: "generating" },
              data: { status: "narrating", progress: 100 },
            });
            if (transitioned.count === 0) {
              console.log(`${LOG} Project ${projectId} already transitioned from generating — skipping narration`);
              continue;
            }
            console.log(
              `${LOG} All scenes complete for project ${projectId} — status → narrating`
            );

            // Auto-trigger narration, then auto-stitch (fire-and-forget)
            (async () => {
              try {
                if (!novitaApiKey || !project.voiceId || !isValidVoiceId(project.voiceId)) return;
                // Re-fetch scenes with updated durations from probing
                const freshScenesForNarration = await context.entities.StoryScene.findMany({
                  where: { projectId },
                  orderBy: { sceneIndex: "asc" },
                });
                const scenesForTTS = freshScenesForNarration
                  .filter((s: any) => !s.narrationUrl && s.narrationText?.trim())
                  .map((s: any) => ({
                    id: s.id,
                    narrationText: trimNarrationToFit(s.narrationText, s.duration),
                  }));

                if (scenesForTTS.length === 0) {
                  // Already narrated — skip to stitching
                  const stitchGuard = await context.entities.StoryProject.updateMany({
                    where: { id: projectId, status: "narrating" },
                    data: { status: "stitching", errorMessage: null },
                  });
                  if (stitchGuard.count > 0) {
                    console.log(`${LOG} Auto-stitch: all scenes already narrated for project ${projectId}`);
                    await runStitchingPipeline(projectId, project, context);
                  }
                  return;
                }

                console.log(`${LOG} Auto-narration: generating ${scenesForTTS.length} scene(s) for project ${projectId}`);
                const results = await generateAllNarrations(scenesForTTS, project.voiceId, novitaApiKey);
                for (const [sceneId, audioUrl] of results.entries()) {
                  await context.entities.StoryScene.update({
                    where: { id: sceneId },
                    data: { narrationUrl: audioUrl },
                  });
                }

                const allNarrated = results.size === scenesForTTS.length;
                if (allNarrated) {
                  // Auto-trigger stitching
                  const stitchGuard = await context.entities.StoryProject.updateMany({
                    where: { id: projectId, status: "narrating" },
                    data: { status: "stitching", errorMessage: null },
                  });
                  if (stitchGuard.count > 0) {
                    console.log(`${LOG} Auto-stitch: narration complete, starting stitch for project ${projectId}`);
                    await runStitchingPipeline(projectId, project, context);
                  } else {
                    await context.entities.StoryProject.update({
                      where: { id: projectId },
                      data: { status: "narrated", errorMessage: null },
                    });
                  }
                } else {
                  await context.entities.StoryProject.update({
                    where: { id: projectId },
                    data: {
                      status: "generated",
                      errorMessage: "Narration partially failed. Retry from editor.",
                    },
                  });
                }
                console.log(`${LOG} Auto-narration done: ${results.size}/${scenesForTTS.length} for project ${projectId}`);
              } catch (err: any) {
                console.error(`${LOG} Auto-narration failed for project ${projectId}:`, err.message);
                await context.entities.StoryProject.update({
                  where: { id: projectId },
                  data: { status: "generated", errorMessage: `Narration failed: ${err.message}` },
                }).catch(() => {});
              }
            })();
          }
        } else if (result.status === "failed") {
          // ------ Scene failed ------
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

          // No per-scene refund during initial generation — project-level timeout handles it
        } else {
          // ------ Still processing — update progress ------
          await context.entities.StoryScene.update({
            where: { id: scene.id },
            data: { progress: result.progress },
          });
        }
      } catch (err: any) {
        console.error(
          `${LOG} Error polling scene ${scene.id} (task ${scene.taskId}):`,
          err.message
        );
      }
    }

    // Update overall project progress
    const allScenes = await context.entities.StoryScene.findMany({
      where: { projectId },
    });
    const totalProgress = allScenes.reduce(
      (sum: number, s: any) => sum + (s.progress || 0),
      0
    );
    const avgProgress = allScenes.length > 0 ? Math.round(totalProgress / allScenes.length) : 0;

    await context.entities.StoryProject.update({
      where: { id: projectId },
      data: { progress: avgProgress },
    });
  }

  // Clean up orphaned temp dirs at the end of the cron job
  await cleanupOrphanedTempDirs();
};
