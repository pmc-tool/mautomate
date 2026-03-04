import { User } from "wasp/entities";
import { PrismaClient } from "wasp/server";
import { PaymentPlanId, SubscriptionStatus, paymentPlans } from "./plans";
import { prisma } from "wasp/server";
import { resetPlanCredits, addCredits } from "../credits/creditService";

export async function fetchUserPaymentProcessorUserId(
  userId: User["id"],
  prismaUserDelegate: PrismaClient["user"],
): Promise<string | null> {
  const user = await prismaUserDelegate.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      paymentProcessorUserId: true,
    },
  });

  return user.paymentProcessorUserId;
}

interface UpdateUserPaymentProcessorUserIdArgs {
  userId: User["id"];
  paymentProcessorUserId: NonNullable<User["paymentProcessorUserId"]>;
}

export function updateUserPaymentProcessorUserId(
  { userId, paymentProcessorUserId }: UpdateUserPaymentProcessorUserIdArgs,
  prismaUserDelegate: PrismaClient["user"],
): Promise<User> {
  return prismaUserDelegate.update({
    where: {
      id: userId,
    },
    data: {
      paymentProcessorUserId,
    },
  });
}

interface UpdateUserSubscriptionArgs {
  paymentProcessorUserId: NonNullable<User["paymentProcessorUserId"]>;
  subscriptionStatus: SubscriptionStatus;
  paymentPlanId?: PaymentPlanId;
  datePaid?: Date;
}

export function updateUserSubscription(
  {
    paymentProcessorUserId,
    paymentPlanId,
    subscriptionStatus,
    datePaid,
  }: UpdateUserSubscriptionArgs,
  userDelegate: PrismaClient["user"],
): Promise<User> {
  return userDelegate.update({
    where: {
      paymentProcessorUserId,
    },
    data: {
      subscriptionPlan: paymentPlanId,
      subscriptionStatus,
      datePaid,
    },
  });
}

/**
 * Refresh plan credits when a subscription invoice is paid.
 */
export async function refreshPlanCredits(
  paymentProcessorUserId: string,
  paymentPlanId: PaymentPlanId,
): Promise<void> {
  const plan = paymentPlans[paymentPlanId];
  if (plan.effect.kind !== "subscription") return;

  const user = await prisma.user.findUnique({
    where: { paymentProcessorUserId },
    select: { id: true },
  });

  if (!user) return;

  await resetPlanCredits(prisma, user.id, plan.effect.monthlyCredits);
}

/**
 * Add top-up credits when a top-up pack is purchased.
 */
export async function addTopUpCredits(
  paymentProcessorUserId: string,
  paymentPlanId: PaymentPlanId,
): Promise<void> {
  const plan = paymentPlans[paymentPlanId];
  if (plan.effect.kind !== "topup") return;

  const user = await prisma.user.findUnique({
    where: { paymentProcessorUserId },
    select: { id: true },
  });

  if (!user) return;

  await addCredits(
    prisma,
    user.id,
    plan.effect.credits,
    "top_up",
    `Purchased ${plan.effect.credits} credits`,
  );
}
