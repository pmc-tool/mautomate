import { HttpError } from "wasp/server";
import { type AuthUser } from "wasp/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAdmin(user: AuthUser | undefined) {
  if (!user) throw new HttpError(401, "Not authenticated");
  if (!user.isAdmin) throw new HttpError(403, "Admin access required");
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getAdminAffiliateOverview = async (_args: void, context: any) => {
  requireAdmin(context.user);

  const [
    totalAffiliates,
    totalClicks,
    totalConversions,
    commissions,
    pendingWithdrawals,
    settings,
    topAffiliatesRaw,
    recentConversions,
  ] = await Promise.all([
    context.entities.AffiliateLink.count(),
    context.entities.AffiliateClick.count(),
    context.entities.AffiliateConversion.count(),
    context.entities.AffiliateCommission.findMany({
      select: { amount: true, status: true },
    }),
    context.entities.AffiliateWithdrawal.count({ where: { status: "pending" } }),
    context.entities.Setting.findMany({
      where: { key: { startsWith: "affiliate." } },
    }),
    context.entities.AffiliateCommission.groupBy({
      by: ["affiliateId"],
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
    context.entities.AffiliateConversion.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        convertedUser: { select: { id: true, email: true, createdAt: true } },
        link: { select: { code: true, user: { select: { email: true } } } },
      },
    }),
  ]);

  const totalCommissions = commissions.reduce((s: number, c: any) => s + c.amount, 0);
  const pendingCommissions = commissions.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + c.amount, 0);

  // Enrich top affiliates with user info
  const affiliateUserIds = topAffiliatesRaw.map((a: any) => a.affiliateId);
  const affiliateUsers = await context.entities.User.findMany({
    where: { id: { in: affiliateUserIds } },
    select: { id: true, email: true },
  });
  const userMap: Map<string, any> = new Map(affiliateUsers.map((u: any) => [u.id, u]));

  const topAffiliates = topAffiliatesRaw.map((a: any) => ({
    userId: a.affiliateId,
    email: userMap.get(a.affiliateId)?.email ?? "Unknown",
    totalEarnings: parseFloat((a._sum.amount ?? 0).toFixed(2)),
    commissionCount: a._count,
  }));

  // Parse settings into a map
  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return {
    totalAffiliates,
    totalClicks,
    totalConversions,
    totalCommissions: parseFloat(totalCommissions.toFixed(2)),
    pendingCommissions: parseFloat(pendingCommissions.toFixed(2)),
    pendingWithdrawals,
    topAffiliates,
    recentConversions,
    settings: {
      enabled: settingsMap["affiliate.enabled"] ?? "true",
      subscriptionRate: settingsMap["affiliate.subscription_rate"] ?? "30",
      extensionRate: settingsMap["affiliate.extension_rate"] ?? "25",
      topupRate: settingsMap["affiliate.topup_rate"] ?? "15",
      minPayout: settingsMap["affiliate.min_payout"] ?? "50",
      cookieDays: settingsMap["affiliate.cookie_days"] ?? "90",
    },
  };
};

export const getAdminWithdrawalRequests = async (
  args: { status?: string; page?: number; pageSize?: number },
  context: any,
) => {
  requireAdmin(context.user);

  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;

  const where: any = {};
  if (args.status) where.status = args.status;

  const [withdrawals, total] = await Promise.all([
    context.entities.AffiliateWithdrawal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, email: true } },
      },
    }),
    context.entities.AffiliateWithdrawal.count({ where }),
  ]);

  return { withdrawals, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const processWithdrawal = async (
  args: { withdrawalId: string; transactionId?: string },
  context: any,
) => {
  requireAdmin(context.user);

  const withdrawal = await context.entities.AffiliateWithdrawal.findUnique({
    where: { id: args.withdrawalId },
  });
  if (!withdrawal) throw new HttpError(404, "Withdrawal not found");
  if (withdrawal.status !== "pending" && withdrawal.status !== "processing") {
    throw new HttpError(400, "Withdrawal cannot be processed in its current state");
  }

  return context.entities.AffiliateWithdrawal.update({
    where: { id: args.withdrawalId },
    data: {
      status: "completed",
      processedAt: new Date(),
      processedBy: context.user!.id,
      transactionId: args.transactionId ?? null,
    },
  });
};

export const rejectWithdrawal = async (
  args: { withdrawalId: string; reason: string },
  context: any,
) => {
  requireAdmin(context.user);

  const withdrawal = await context.entities.AffiliateWithdrawal.findUnique({
    where: { id: args.withdrawalId },
  });
  if (!withdrawal) throw new HttpError(404, "Withdrawal not found");
  if (withdrawal.status !== "pending") {
    throw new HttpError(400, "Only pending withdrawals can be rejected");
  }

  return context.entities.AffiliateWithdrawal.update({
    where: { id: args.withdrawalId },
    data: {
      status: "rejected",
      processedAt: new Date(),
      processedBy: context.user!.id,
      rejectionReason: args.reason,
    },
  });
};

export const updateAffiliateSettings = async (
  args: {
    enabled?: string;
    subscriptionRate?: string;
    extensionRate?: string;
    topupRate?: string;
    minPayout?: string;
    cookieDays?: string;
  },
  context: any,
) => {
  requireAdmin(context.user);

  const keyMap: Record<string, string | undefined> = {
    "affiliate.enabled": args.enabled,
    "affiliate.subscription_rate": args.subscriptionRate,
    "affiliate.extension_rate": args.extensionRate,
    "affiliate.topup_rate": args.topupRate,
    "affiliate.min_payout": args.minPayout,
    "affiliate.cookie_days": args.cookieDays,
  };

  for (const [key, value] of Object.entries(keyMap)) {
    if (value === undefined) continue;
    await context.entities.Setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  return { success: true };
};
