// ---------------------------------------------------------------------------
// PgBoss cron job: Poll Novita for processing story scenes
// Runs every minute. Chains scene submissions sequentially for continuity.
// ---------------------------------------------------------------------------

import { prisma } from "wasp/server";
import {
  checkStatus,
  submitI2V,
  submitT2V,
  resolutionToSize,
} from "./novitaVideoClient";
import { CreditActionType } from "../../credits/creditConfig";
import { refundCredits } from "../../credits/creditService";
import { generateAllNarrations, isValidVoiceId } from "./ttsService";

const LOG = "[storyCheckJob]";
const SCENE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const PROJECT_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours — stop processing projects older than this
const MAX_SCENE_RETRIES = 2; // retry failed scenes up to 2 times

export const storyStatusCheck = async (_args: any, context: any) => {
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

    if (stuckProjects.length === 0) return;

    const apiKey = await context.entities.Setting.findUnique({
      where: { key: "ext.long-story-video.novita_api_key" },
    });
    if (!apiKey?.value) return;

    for (const project of stuckProjects) {
      // Skip projects older than 2 hours — mark as failed
      const projectAge = Date.now() - new Date(project.createdAt).getTime();
      if (projectAge > PROJECT_MAX_AGE_MS) {
        console.warn(`${LOG} Project ${project.id} is ${Math.round(projectAge / 60000)}m old — marking as failed`);
        await context.entities.StoryProject.update({
          where: { id: project.id },
          data: { status: "failed", errorMessage: "Generation timed out. Please create a new story." },
        });
        continue;
      }

      const hasGenerating = project.scenes.some((s: any) => s.status === "generating");
      if (hasGenerating) continue; // not stuck

      // Check if all scenes failed — mark project as failed
      const allFailed = project.scenes.every((s: any) => s.status === "failed");
      const allDone = project.scenes.every((s: any) => s.status === "completed" || s.status === "failed");
      if (allFailed) {
        await context.entities.StoryProject.update({
          where: { id: project.id },
          data: { status: "failed", errorMessage: "All scenes failed to generate." },
        });
        console.warn(`${LOG} All scenes failed for project ${project.id} — marked as failed`);
        continue;
      }

      // Try to retry a failed scene (up to MAX_SCENE_RETRIES) or submit next pending
      const failedScene = project.scenes.find(
        (s: any) => s.status === "failed" && (s.retryCount || 0) < MAX_SCENE_RETRIES
      );
      const nextPending = project.scenes.find((s: any) => s.status === "pending");
      const sceneToSubmit = nextPending || failedScene;

      if (sceneToSubmit) {
        const size = resolutionToSize(
          (project.resolution || "720p") as "720p" | "1080p",
          "16:9"
        );
        try {
          const isRetry = sceneToSubmit.status === "failed";
          console.log(`${LOG} Recovery${isRetry ? " (retry)" : ""}: submitting scene ${sceneToSubmit.sceneIndex} for project ${project.id}`);
          const result = await submitT2V(apiKey.value, {
            prompt: sceneToSubmit.visualPrompt,
            duration: sceneToSubmit.duration as 5 | 10 | 15,
            size,
            shot_type: sceneToSubmit.shotType,
          });
          await context.entities.StoryScene.update({
            where: { id: sceneToSubmit.id },
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
      } else if (allDone) {
        // Some completed, some failed with max retries — mark project failed
        const failedCount = project.scenes.filter((s: any) => s.status === "failed").length;
        await context.entities.StoryProject.update({
          where: { id: project.id },
          data: { status: "failed", errorMessage: `${failedCount} scene(s) failed after retries.` },
        });
      }
    }
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
  const apiKeySetting = await context.entities.Setting.findUnique({
    where: { key: "ext.long-story-video.novita_api_key" },
  });

  if (!apiKeySetting?.value) {
    console.error(
      `${LOG} Novita API key not configured (ext.long-story-video.novita_api_key). Skipping poll.`
    );
    return;
  }

  const novitaApiKey = apiKeySetting.value;

  for (const [projectId, scenes] of scenesByProject.entries()) {
    const project = scenes[0].project;
    const size = resolutionToSize(
      (project.resolution || "720p") as "720p" | "1080p",
      "16:9"
    );

    for (const scene of scenes) {
      try {
        // Timeout protection: if scene has been generating for > 15 minutes, mark failed and refund
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
          try {
            await refundCredits(
              prisma,
              project.userId,
              CreditActionType.StorySceneRegen,
              `Scene ${scene.sceneIndex} timed out after 15 minutes`
            );
            console.log(`${LOG} Refunded credits for timed-out scene ${scene.id}`);
          } catch (refundErr: any) {
            console.error(`${LOG} Failed to refund credits for timed-out scene ${scene.id}:`, refundErr.message);
          }
          continue;
        }

        const result = await checkStatus(novitaApiKey, scene.taskId);

        if (result.status === "completed" && result.videoUrl) {
          // ------ Scene completed ------
          await context.entities.StoryScene.update({
            where: { id: scene.id },
            data: {
              status: "completed",
              progress: 100,
              videoUrl: result.videoUrl,
            },
          });

          console.log(
            `${LOG} Scene ${scene.id} (project ${projectId}, index ${scene.sceneIndex}) completed`
          );

          // Find and submit next pending scene
          const nextScene = await context.entities.StoryScene.findFirst({
            where: {
              projectId,
              sceneIndex: scene.sceneIndex + 1,
              status: "pending",
            },
          });

          if (nextScene) {
            let submitResult;
            try {
              // Use T2V for scene chaining (I2V requires image, not video URL)
              submitResult = await submitT2V(novitaApiKey, {
                prompt: nextScene.visualPrompt,
                duration: nextScene.duration as 5 | 10 | 15,
                size,
                shot_type: nextScene.shotType,
              });

              await context.entities.StoryScene.update({
                where: { id: nextScene.id },
                data: {
                  status: "generating",
                  taskId: submitResult.task_id,
                },
              });

              console.log(
                `${LOG} Next scene ${nextScene.id} (index ${nextScene.sceneIndex}) submitted as task ${submitResult.task_id}`
              );
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

          // Check if ALL scenes in this project are now complete
          const allProjectScenes = await context.entities.StoryScene.findMany({
            where: { projectId },
          });
          const allComplete = allProjectScenes.every(
            (s: any) => s.status === "completed"
          );

          if (allComplete) {
            await context.entities.StoryProject.update({
              where: { id: projectId },
              data: { status: "narrating", progress: 100 },
            });
            console.log(
              `${LOG} All scenes complete for project ${projectId} — status → narrating`
            );

            // Auto-trigger narration (fire-and-forget)
            (async () => {
              try {
                if (!novitaApiKey || !project.voiceId || !isValidVoiceId(project.voiceId)) return;
                const scenesForTTS = allProjectScenes
                  .filter((s: any) => !s.narrationUrl)
                  .map((s: any) => ({ id: s.id, narrationText: s.narrationText }));
                if (scenesForTTS.length === 0) {
                  await context.entities.StoryProject.update({
                    where: { id: projectId },
                    data: { status: "narrated" },
                  });
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
                await context.entities.StoryProject.update({
                  where: { id: projectId },
                  data: {
                    status: allNarrated ? "narrated" : "generated",
                    errorMessage: allNarrated ? null : "Narration partially failed. Retry from editor.",
                  },
                });
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

          // Refund approximate per-scene credits
          try {
            await refundCredits(
              prisma,
              project.userId,
              CreditActionType.StorySceneRegen,
              `Scene ${scene.sceneIndex} generation failed: ${result.error}`
            );
            console.log(
              `${LOG} Refunded credits for failed scene ${scene.id}`
            );
          } catch (refundErr: any) {
            console.error(
              `${LOG} Failed to refund credits for scene ${scene.id}:`,
              refundErr.message
            );
          }
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
    const avgProgress = Math.round(totalProgress / allScenes.length);

    await context.entities.StoryProject.update({
      where: { id: projectId },
      data: { progress: avgProgress },
    });
  }
};
