import { prisma } from "wasp/server";
import { resetPlanCredits, getPlanAllotment } from "./creditService";

/**
 * PgBoss daily job: resets plan credits for subscribers whose creditResetDate has passed.
 * Runs at midnight UTC daily.
 */
export async function resetMonthlyCredits(): Promise<void> {
  const now = new Date();

  // Find active subscribers whose reset date is in the past
  const users = await prisma.user.findMany({
    where: {
      subscriptionStatus: "active",
      creditResetDate: { lte: now },
      subscriptionPlan: { not: null },
    },
    select: {
      id: true,
      subscriptionPlan: true,
    },
  });

  if (users.length === 0) return;

  let resetCount = 0;

  for (const user of users) {
    const allotment = getPlanAllotment(user.subscriptionPlan);

    if (allotment > 0) {
      try {
        await resetPlanCredits(prisma, user.id, allotment);
        resetCount++;
      } catch (err) {
        console.error(
          `[CreditReset] Failed to reset credits for user ${user.id}:`,
          err,
        );
      }
    }
  }

  if (resetCount > 0) {
    console.log(
      `[CreditReset] Reset plan credits for ${resetCount}/${users.length} users`,
    );
  }
}
