import { requireNodeEnvVar } from "../server/utils";

export enum SubscriptionStatus {
  PastDue = "past_due",
  CancelAtPeriodEnd = "cancel_at_period_end",
  Active = "active",
  Deleted = "deleted",
}

export enum PaymentPlanId {
  Starter = "starter",
  Growth = "growth",
  Pro = "pro",
  Agency = "agency",
  TopUp500 = "topup_500",
  TopUp2000 = "topup_2000",
  TopUp5000 = "topup_5000",
}

export interface PaymentPlan {
  getPaymentProcessorPlanId: () => string;
  effect: PaymentPlanEffect;
}

export type PaymentPlanEffect =
  | { kind: "subscription"; monthlyCredits: number }
  | { kind: "topup"; credits: number };

export const paymentPlans = {
  [PaymentPlanId.Starter]: {
    getPaymentProcessorPlanId: () =>
      requireNodeEnvVar("PAYMENTS_STARTER_SUBSCRIPTION_PLAN_ID"),
    effect: { kind: "subscription", monthlyCredits: 3_000 },
  },
  [PaymentPlanId.Growth]: {
    getPaymentProcessorPlanId: () =>
      requireNodeEnvVar("PAYMENTS_GROWTH_SUBSCRIPTION_PLAN_ID"),
    effect: { kind: "subscription", monthlyCredits: 8_000 },
  },
  [PaymentPlanId.Pro]: {
    getPaymentProcessorPlanId: () =>
      requireNodeEnvVar("PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID"),
    effect: { kind: "subscription", monthlyCredits: 20_000 },
  },
  [PaymentPlanId.Agency]: {
    getPaymentProcessorPlanId: () =>
      requireNodeEnvVar("PAYMENTS_AGENCY_SUBSCRIPTION_PLAN_ID"),
    effect: { kind: "subscription", monthlyCredits: 50_000 },
  },
  [PaymentPlanId.TopUp500]: {
    getPaymentProcessorPlanId: () =>
      requireNodeEnvVar("PAYMENTS_TOPUP_500_PLAN_ID"),
    effect: { kind: "topup", credits: 500 },
  },
  [PaymentPlanId.TopUp2000]: {
    getPaymentProcessorPlanId: () =>
      requireNodeEnvVar("PAYMENTS_TOPUP_2000_PLAN_ID"),
    effect: { kind: "topup", credits: 2_000 },
  },
  [PaymentPlanId.TopUp5000]: {
    getPaymentProcessorPlanId: () =>
      requireNodeEnvVar("PAYMENTS_TOPUP_5000_PLAN_ID"),
    effect: { kind: "topup", credits: 5_000 },
  },
} as const satisfies Record<PaymentPlanId, PaymentPlan>;

export function prettyPaymentPlanName(planId: PaymentPlanId): string {
  const planToName: Record<PaymentPlanId, string> = {
    [PaymentPlanId.Starter]: "Starter",
    [PaymentPlanId.Growth]: "Growth",
    [PaymentPlanId.Pro]: "Pro",
    [PaymentPlanId.Agency]: "Agency",
    [PaymentPlanId.TopUp500]: "500 Credits",
    [PaymentPlanId.TopUp2000]: "2,000 Credits",
    [PaymentPlanId.TopUp5000]: "5,000 Credits",
  };
  return planToName[planId];
}

export function parsePaymentPlanId(planId: string): PaymentPlanId {
  if ((Object.values(PaymentPlanId) as string[]).includes(planId)) {
    return planId as PaymentPlanId;
  } else {
    throw new Error(`Invalid PaymentPlanId: ${planId}`);
  }
}

export function getSubscriptionPaymentPlanIds(): PaymentPlanId[] {
  return Object.values(PaymentPlanId).filter(
    (planId) => paymentPlans[planId].effect.kind === "subscription",
  );
}

export function getTopUpPaymentPlanIds(): PaymentPlanId[] {
  return Object.values(PaymentPlanId).filter(
    (planId) => paymentPlans[planId].effect.kind === "topup",
  );
}

export function getPaymentPlanIdByPaymentProcessorPlanId(
  paymentProcessorPlanId: string,
): PaymentPlanId {
  for (const [planId, plan] of Object.entries(paymentPlans)) {
    if (plan.getPaymentProcessorPlanId() === paymentProcessorPlanId) {
      return planId as PaymentPlanId;
    }
  }

  throw new Error(
    `Unknown payment processor plan ID: ${paymentProcessorPlanId}`,
  );
}
