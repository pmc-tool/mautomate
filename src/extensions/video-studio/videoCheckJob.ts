// ---------------------------------------------------------------------------
// Video Studio — PgBoss Job: Poll fal.ai for processing video generations
// Runs every 30 seconds. Updates status/videoUrl when complete.
// ---------------------------------------------------------------------------

import { checkStatus, getResult } from "./falClient";
import { getModelByKey } from "./modelRegistry";
import {
  CreditActionType,
  CREDIT_COSTS,
} from "../../credits/creditConfig";

const FAL_KEY_SETTING = "ext.video-studio.fal_api_key";

function getCreditAction(tier: string): CreditActionType {
  if (tier === "premium") return CreditActionType.VideoPremium;
  if (tier === "standard") return CreditActionType.VideoStandard;
  return CreditActionType.VideoBasic;
}

export async function videoStatusCheck(_args: unknown, context: any) {
  // Get the fal.ai API key
  const setting = await context.entities.Setting.findUnique({
    where: { key: FAL_KEY_SETTING },
  });

  if (!setting?.value) {
    // No API key configured — nothing to poll
    return;
  }

  const apiKey = setting.value;

  // Find all processing generations
  const processing = await context.entities.VideoGeneration.findMany({
    where: {
      status: { in: ["queued", "processing"] },
      requestId: { not: null },
    },
  });

  if (processing.length === 0) return;

  console.log(
    `[videoStatusCheck] Polling ${processing.length} generation(s)...`,
  );

  let completedCount = 0;
  let failedCount = 0;

  for (const gen of processing) {
    try {
      const statusResult = await checkStatus(
        apiKey,
        gen.modelEndpoint,
        gen.requestId!,
      );

      if (statusResult.status === "COMPLETED") {
        const result = await getResult(
          apiKey,
          gen.modelEndpoint,
          gen.requestId!,
        );

        await context.entities.VideoGeneration.update({
          where: { id: gen.id },
          data: {
            status: "completed",
            progress: 100,
            videoUrl: result.videoUrl,
            thumbnailUrl: result.thumbnailUrl,
          },
        });

        completedCount++;
      } else if (statusResult.status === "FAILED") {
        // Refund credits on failure
        const model = getModelByKey(gen.model);
        const creditAction = getCreditAction(model?.tier || "budget");
        const refundAmount = CREDIT_COSTS[creditAction];

        // Refund to planCredits bucket
        const user = await context.entities.User.findUnique({
          where: { id: gen.userId },
          select: { trialCredits: true, planCredits: true, topUpCredits: true },
        });

        if (user) {
          await context.entities.User.update({
            where: { id: gen.userId },
            data: { planCredits: { increment: refundAmount } },
          });

          const newTotal =
            user.trialCredits + user.planCredits + refundAmount + user.topUpCredits;

          await context.entities.CreditTransaction.create({
            data: {
              userId: gen.userId,
              amount: refundAmount,
              balanceAfter: newTotal,
              type: "refund",
              actionType: creditAction,
              description: `Refunded ${refundAmount} credits: video generation failed on fal.ai`,
            },
          });
        }

        await context.entities.VideoGeneration.update({
          where: { id: gen.id },
          data: {
            status: "failed",
            errorMessage: "Generation failed on fal.ai",
          },
        });

        failedCount++;
      } else {
        // Still processing — update progress
        await context.entities.VideoGeneration.update({
          where: { id: gen.id },
          data: { progress: statusResult.progress },
        });
      }
    } catch (err: any) {
      console.error(
        `[videoStatusCheck] Error polling generation ${gen.id}:`,
        err.message,
      );
      // Don't fail the entire job for one bad request
    }
  }

  if (completedCount > 0 || failedCount > 0) {
    console.log(
      `[videoStatusCheck] Completed: ${completedCount}, Failed: ${failedCount}`,
    );
  }
}
