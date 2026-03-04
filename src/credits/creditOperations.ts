import { HttpError } from "wasp/server";
import type {
  GetCreditsBalance,
  GetCreditTransactions,
} from "wasp/server/operations";
import { getTotalBalance, getPlanAllotment } from "./creditService";
import { PLAN_CREDIT_ALLOTMENTS } from "./creditConfig";

// ---------------------------------------------------------------------------
// Query: getCreditsBalance
// ---------------------------------------------------------------------------

export const getCreditsBalance: GetCreditsBalance<void, any> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const user = await context.entities.User.findUniqueOrThrow({
    where: { id: context.user.id },
    select: {
      planCredits: true,
      topUpCredits: true,
      trialCredits: true,
      creditResetDate: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  });

  const planAllotment = getPlanAllotment(user.subscriptionPlan);

  return {
    planCredits: user.planCredits,
    topUpCredits: user.topUpCredits,
    trialCredits: user.trialCredits,
    totalBalance: getTotalBalance(user),
    planName: user.subscriptionPlan ?? "free",
    planAllotment,
    creditResetDate: user.creditResetDate,
    subscriptionStatus: user.subscriptionStatus,
  };
};

// ---------------------------------------------------------------------------
// Query: getCreditTransactions
// ---------------------------------------------------------------------------

export const getCreditTransactions: GetCreditTransactions<any, any> = async (
  args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const where: Record<string, unknown> = {
    userId: context.user.id,
  };

  if (args?.actionType) {
    where.actionType = args.actionType;
  }

  const take = Math.min(args?.limit ?? 50, 100);

  const transactions = await context.entities.CreditTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1, // fetch one extra to check if more exist
    ...(args?.cursor
      ? {
          cursor: { id: args.cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = transactions.length > take;
  const items = hasMore ? transactions.slice(0, take) : transactions;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
};
