import { HttpError, prisma } from "wasp/server";
import { type AuthUser } from "wasp/auth";
import { getAffiliateTier, AFFILIATE_TIERS } from "./affiliateService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCode(email: string | null | undefined): string {
  const base = email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") || "user";
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`.toLowerCase();
}

async function getSettingValue(key: string, defaultValue: string): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getAffiliateStats = async (_args: void, context: any) => {
  const user = context.user as AuthUser;
  if (!user) throw new HttpError(401, "Not authenticated");

  const link = await context.entities.AffiliateLink.findUnique({
    where: { userId: user.id },
    include: {
      _count: { select: { clicks: true, conversions: true } },
    },
  });

  if (!link) {
    return {
      hasLink: false,
      clicks: 0,
      conversions: 0,
      conversionRate: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
      availableBalance: 0,
      tier: { name: "Starter", multiplier: 1.0, conversions: 0, nextTier: "Growth", conversionsToNext: 11 },
    };
  }

  const commissions = await context.entities.AffiliateCommission.findMany({
    where: { affiliateId: user.id },
    select: { amount: true, status: true },
  });

  const totalEarnings = commissions.reduce((sum: number, c: any) => sum + c.amount, 0);
  const pendingEarnings = commissions.filter((c: any) => c.status === "pending").reduce((sum: number, c: any) => sum + c.amount, 0);
  const paidEarnings = commissions.filter((c: any) => c.status === "paid").reduce((sum: number, c: any) => sum + c.amount, 0);
  const approvedEarnings = commissions.filter((c: any) => c.status === "approved").reduce((sum: number, c: any) => sum + c.amount, 0);

  const withdrawals = await context.entities.AffiliateWithdrawal.findMany({
    where: { userId: user.id, status: { in: ["pending", "processing", "completed"] } },
    select: { amount: true, status: true },
  });
  const withdrawnOrPending = withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
  const availableBalance = Math.max(0, approvedEarnings - withdrawnOrPending);

  const tier = await getAffiliateTier(context.entities, link.id);

  const clicks = link._count.clicks;
  const conversions = link._count.conversions;

  return {
    hasLink: true,
    clicks,
    conversions,
    conversionRate: clicks > 0 ? parseFloat(((conversions / clicks) * 100).toFixed(1)) : 0,
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    pendingEarnings: parseFloat(pendingEarnings.toFixed(2)),
    paidEarnings: parseFloat(paidEarnings.toFixed(2)),
    availableBalance: parseFloat(availableBalance.toFixed(2)),
    tier,
  };
};

export const getAffiliateLink = async (_args: void, context: any) => {
  const user = context.user as AuthUser;
  if (!user) throw new HttpError(401, "Not authenticated");

  const link = await context.entities.AffiliateLink.findUnique({
    where: { userId: user.id },
    include: {
      _count: { select: { clicks: true, conversions: true } },
    },
  });

  return link;
};

export const getAffiliateCommissions = async (
  args: { status?: string; eventType?: string; page?: number; pageSize?: number },
  context: any,
) => {
  const user = context.user as AuthUser;
  if (!user) throw new HttpError(401, "Not authenticated");

  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;

  const where: any = { affiliateId: user.id };
  if (args.status) where.status = args.status;
  if (args.eventType) where.eventType = args.eventType;

  const [commissions, total] = await Promise.all([
    context.entities.AffiliateCommission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    context.entities.AffiliateCommission.count({ where }),
  ]);

  return { commissions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

export const getAffiliateWithdrawals = async (
  args: { page?: number; pageSize?: number },
  context: any,
) => {
  const user = context.user as AuthUser;
  if (!user) throw new HttpError(401, "Not authenticated");

  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;

  const where = { userId: user.id };

  const [withdrawals, total] = await Promise.all([
    context.entities.AffiliateWithdrawal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    context.entities.AffiliateWithdrawal.count({ where }),
  ]);

  return { withdrawals, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const createAffiliateLink = async (_args: void, context: any) => {
  const user = context.user as AuthUser;
  if (!user) throw new HttpError(401, "Not authenticated");

  // Check if user already has a link
  const existing = await context.entities.AffiliateLink.findUnique({
    where: { userId: user.id },
  });
  if (existing) throw new HttpError(409, "Affiliate link already exists");

  // Generate unique code
  let code = generateCode(user.email);
  let attempt = 0;
  while (attempt < 10) {
    const exists = await context.entities.AffiliateLink.findUnique({ where: { code } });
    if (!exists) break;
    code = generateCode(user.email);
    attempt++;
  }

  const link = await context.entities.AffiliateLink.create({
    data: { userId: user.id, code },
  });

  return link;
};

export const updateAffiliateLink = async (
  args: { customSlug?: string; isActive?: boolean },
  context: any,
) => {
  const user = context.user as AuthUser;
  if (!user) throw new HttpError(401, "Not authenticated");

  const link = await context.entities.AffiliateLink.findUnique({
    where: { userId: user.id },
  });
  if (!link) throw new HttpError(404, "Affiliate link not found");

  const data: any = {};
  if (args.isActive !== undefined) data.isActive = args.isActive;
  if (args.customSlug !== undefined) {
    // Validate slug
    const slug = args.customSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (slug && slug !== link.code) {
      const exists = await context.entities.AffiliateLink.findUnique({ where: { code: slug } });
      if (exists) throw new HttpError(409, "This slug is already taken");
      data.code = slug;
      data.customSlug = slug;
    }
  }

  return context.entities.AffiliateLink.update({
    where: { id: link.id },
    data,
  });
};

export const claimReferral = async (args: { code: string }, context: any) => {
  const user = context.user as AuthUser;
  if (!user) throw new HttpError(401, "Not authenticated");

  // Idempotent: skip if already referred
  const currentUser = await context.entities.User.findUnique({
    where: { id: user.id },
    select: { referredByCode: true },
  });
  if (currentUser?.referredByCode) return { success: true, alreadyClaimed: true };

  // Validate the affiliate code
  const affiliateLink = await context.entities.AffiliateLink.findUnique({
    where: { code: args.code },
    select: { id: true, userId: true, isActive: true },
  });
  if (!affiliateLink || !affiliateLink.isActive) return { success: false };

  // Prevent self-referral
  if (affiliateLink.userId === user.id) return { success: false };

  // Check if conversion already exists
  const existingConversion = await context.entities.AffiliateConversion.findUnique({
    where: { convertedUserId: user.id },
  });
  if (existingConversion) return { success: true, alreadyClaimed: true };

  // Set the referral code on the user
  await context.entities.User.update({
    where: { id: user.id },
    data: { referredByCode: args.code },
  });

  // Create conversion record
  await context.entities.AffiliateConversion.create({
    data: {
      linkId: affiliateLink.id,
      convertedUserId: user.id,
      eventType: "signup",
    },
  });

  return { success: true };
};

export const requestWithdrawal = async (
  args: { amount: number; method: string; paymentDetails: Record<string, string> },
  context: any,
) => {
  const user = context.user as AuthUser;
  if (!user) throw new HttpError(401, "Not authenticated");

  // Calculate available balance
  const commissions = await context.entities.AffiliateCommission.findMany({
    where: { affiliateId: user.id, status: "approved" },
    select: { amount: true },
  });
  const approvedTotal = commissions.reduce((sum: number, c: any) => sum + c.amount, 0);

  const withdrawals = await context.entities.AffiliateWithdrawal.findMany({
    where: { userId: user.id, status: { in: ["pending", "processing", "completed"] } },
    select: { amount: true },
  });
  const withdrawnOrPending = withdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
  const available = approvedTotal - withdrawnOrPending;

  if (args.amount > available) {
    throw new HttpError(400, "Insufficient available balance");
  }

  // Check minimum payout
  const minPayoutStr = await getSettingValue("affiliate.min_payout", "50");
  const minPayout = parseFloat(minPayoutStr);
  if (args.amount < minPayout) {
    throw new HttpError(400, `Minimum withdrawal amount is $${minPayout}`);
  }

  // Validate method
  const validMethods = ["paypal", "bank_transfer", "stripe_connect"];
  if (!validMethods.includes(args.method)) {
    throw new HttpError(400, "Invalid withdrawal method");
  }

  return context.entities.AffiliateWithdrawal.create({
    data: {
      userId: user.id,
      amount: args.amount,
      method: args.method,
      paymentDetails: args.paymentDetails,
    },
  });
};
