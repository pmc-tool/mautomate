import { HttpError } from "wasp/server";
import { type PrismaClient } from "@prisma/client";
import {
  CreditActionType,
  CREDIT_COSTS,
  PLAN_CREDIT_ALLOTMENTS,
} from "./creditConfig";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Prisma = PrismaClient;
type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// ---------------------------------------------------------------------------
// getTotalBalance
// ---------------------------------------------------------------------------

export function getTotalBalance(user: {
  trialCredits: number;
  planCredits: number;
  topUpCredits: number;
}): number {
  return user.trialCredits + user.planCredits + user.topUpCredits;
}

// ---------------------------------------------------------------------------
// checkCredits — throws 402 if insufficient
// ---------------------------------------------------------------------------

export async function checkCredits(
  prisma: Prisma,
  userId: string,
  actionType: CreditActionType,
  multiplier: number = 1,
): Promise<void> {
  const cost = CREDIT_COSTS[actionType] * multiplier;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { trialCredits: true, planCredits: true, topUpCredits: true },
  });

  const total = getTotalBalance(user);

  if (total < cost) {
    throw new HttpError(
      402,
      JSON.stringify({
        message: "Insufficient credits",
        required: cost,
        available: total,
        actionType,
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// deductCredits — atomic deduction with drain order: trial → plan → topUp
// ---------------------------------------------------------------------------

export async function deductCredits(
  prisma: Prisma,
  userId: string,
  actionType: CreditActionType,
  metadata?: Record<string, unknown>,
  multiplier: number = 1,
): Promise<void> {
  const cost = CREDIT_COSTS[actionType] * multiplier;

  await prisma.$transaction(async (tx: PrismaTx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { trialCredits: true, planCredits: true, topUpCredits: true },
    });

    const total = getTotalBalance(user);

    if (total < cost) {
      throw new HttpError(
        402,
        JSON.stringify({
          message: "Insufficient credits",
          required: cost,
          available: total,
          actionType,
        }),
      );
    }

    // Drain order: trial → plan → topUp
    let remaining = cost;
    let trialDeduct = 0;
    let planDeduct = 0;
    let topUpDeduct = 0;

    // 1. Drain trial credits first (they're one-time, use-it-or-lose-it)
    if (remaining > 0 && user.trialCredits > 0) {
      trialDeduct = Math.min(remaining, user.trialCredits);
      remaining -= trialDeduct;
    }

    // 2. Drain plan credits (reset monthly, no rollover)
    if (remaining > 0 && user.planCredits > 0) {
      planDeduct = Math.min(remaining, user.planCredits);
      remaining -= planDeduct;
    }

    // 3. Drain top-up credits (never expire)
    if (remaining > 0 && user.topUpCredits > 0) {
      topUpDeduct = Math.min(remaining, user.topUpCredits);
      remaining -= topUpDeduct;
    }

    // Update user balances
    await tx.user.update({
      where: { id: userId },
      data: {
        trialCredits: { decrement: trialDeduct },
        planCredits: { decrement: planDeduct },
        topUpCredits: { decrement: topUpDeduct },
      },
    });

    const newTotal = total - cost;

    // Record transaction
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -cost,
        balanceAfter: newTotal,
        type: "deduction",
        actionType,
        description: `Deducted ${cost} credits for ${actionType}`,
        metadata: (metadata as any) ?? undefined,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// refundCredits — refund to planCredits bucket
// ---------------------------------------------------------------------------

export async function refundCredits(
  prisma: Prisma,
  userId: string,
  actionType: CreditActionType,
  reason: string,
  multiplier: number = 1,
): Promise<void> {
  const amount = CREDIT_COSTS[actionType] * multiplier;

  await prisma.$transaction(async (tx: PrismaTx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { trialCredits: true, planCredits: true, topUpCredits: true },
    });

    // Refund to planCredits bucket (safe default)
    await tx.user.update({
      where: { id: userId },
      data: { planCredits: { increment: amount } },
    });

    const newTotal = getTotalBalance(user) + amount;

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: newTotal,
        type: "refund",
        actionType,
        description: `Refunded ${amount} credits: ${reason}`,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// addCredits — add to the appropriate bucket
// ---------------------------------------------------------------------------

export async function addCredits(
  prisma: Prisma,
  userId: string,
  amount: number,
  type: "plan_refresh" | "top_up" | "trial_grant",
  description?: string,
): Promise<void> {
  await prisma.$transaction(async (tx: PrismaTx) => {
    const bucketField =
      type === "plan_refresh"
        ? "planCredits"
        : type === "top_up"
          ? "topUpCredits"
          : "trialCredits";

    await tx.user.update({
      where: { id: userId },
      data: { [bucketField]: { increment: amount } },
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { trialCredits: true, planCredits: true, topUpCredits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: getTotalBalance(user),
        type,
        description: description ?? `Added ${amount} credits (${type})`,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// resetPlanCredits — monthly reset (no rollover)
// ---------------------------------------------------------------------------

export async function resetPlanCredits(
  prisma: Prisma,
  userId: string,
  monthlyAllotment: number,
): Promise<void> {
  await prisma.$transaction(async (tx: PrismaTx) => {
    // Set planCredits to the allotment (no rollover)
    await tx.user.update({
      where: { id: userId },
      data: {
        planCredits: monthlyAllotment,
        creditResetDate: getNextResetDate(),
      },
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { trialCredits: true, planCredits: true, topUpCredits: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: monthlyAllotment,
        balanceAfter: getTotalBalance(user),
        type: "plan_refresh",
        description: `Monthly plan refresh: ${monthlyAllotment} credits`,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Helper: next reset date (1 month from now)
// ---------------------------------------------------------------------------

function getNextResetDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

// ---------------------------------------------------------------------------
// getPlanAllotment — convenience
// ---------------------------------------------------------------------------

export function getPlanAllotment(planId: string | null): number {
  if (!planId) return 0;
  return PLAN_CREDIT_ALLOTMENTS[planId] ?? 0;
}
