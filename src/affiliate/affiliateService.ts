import { prisma } from "wasp/server";

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

export const AFFILIATE_TIERS: readonly { name: string; minConversions: number; maxConversions: number; multiplier: number }[] = [
  { name: "Starter", minConversions: 0, maxConversions: 10, multiplier: 1.0 },
  { name: "Growth", minConversions: 11, maxConversions: 25, multiplier: 1.1 },
  { name: "Pro", minConversions: 26, maxConversions: 50, multiplier: 1.2 },
  { name: "Elite", minConversions: 51, maxConversions: Infinity, multiplier: 1.33 },
];

export type TierInfo = {
  name: string;
  multiplier: number;
  conversions: number;
  nextTier: string | null;
  conversionsToNext: number;
};

/**
 * getAffiliateTier — accepts either a full PrismaClient-like object (with .affiliateConversion)
 * or the entities bag from Wasp context. We use `(db as any)` to be flexible.
 */
export async function getAffiliateTier(
  db: any,
  affiliateLinkId: string,
): Promise<TierInfo> {
  // Support both prisma.affiliateConversion and entities.AffiliateConversion
  const delegate = db.affiliateConversion ?? db.AffiliateConversion;
  const conversions = await delegate.count({
    where: { linkId: affiliateLinkId },
  });

  let currentTier = AFFILIATE_TIERS[0];
  for (const tier of AFFILIATE_TIERS) {
    if (conversions >= tier.minConversions && conversions <= tier.maxConversions) {
      currentTier = tier;
      break;
    }
  }

  const currentIdx = AFFILIATE_TIERS.indexOf(currentTier);
  const nextTier = currentIdx < AFFILIATE_TIERS.length - 1 ? AFFILIATE_TIERS[currentIdx + 1] : null;

  return {
    name: currentTier.name,
    multiplier: currentTier.multiplier,
    conversions,
    nextTier: nextTier?.name ?? null,
    conversionsToNext: nextTier ? nextTier.minConversions - conversions : 0,
  };
}

// ---------------------------------------------------------------------------
// Commission processing — called from Stripe webhook
// Uses the global `prisma` from wasp/server for direct DB access
// ---------------------------------------------------------------------------

export async function processAffiliateCommission(
  userId: string,
  eventType: "subscription" | "extension" | "topup",
  amount: number,
): Promise<void> {
  try {
    // Check if affiliate system is enabled
    const enabledSetting = await prisma.setting.findUnique({ where: { key: "affiliate.enabled" } });
    if (enabledSetting?.value === "false") return;

    // Find the user and their referral code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredByCode: true },
    });

    if (!user?.referredByCode) return;

    // Find the affiliate link
    const affiliateLink = await prisma.affiliateLink.findUnique({
      where: { code: user.referredByCode },
      select: { id: true, userId: true, isActive: true },
    });

    if (!affiliateLink || !affiliateLink.isActive) return;

    // Get the commission rate for this event type
    const rateKey = `affiliate.${eventType}_rate`;
    const defaultRate = eventType === "subscription" ? "30" : eventType === "extension" ? "25" : "15";
    const rateSetting = await prisma.setting.findUnique({ where: { key: rateKey } });
    const baseRate = parseFloat(rateSetting?.value ?? defaultRate) / 100;

    // Get tier multiplier
    const tierInfo = await getAffiliateTier(prisma, affiliateLink.id);
    const effectiveRate = baseRate * tierInfo.multiplier;
    const commissionAmount = parseFloat((amount * effectiveRate).toFixed(2));

    if (commissionAmount <= 0) return;

    // Create the commission record
    await prisma.affiliateCommission.create({
      data: {
        linkId: affiliateLink.id,
        affiliateId: affiliateLink.userId,
        amount: commissionAmount,
        originalAmount: amount,
        commissionRate: effectiveRate,
        status: "pending",
        eventType,
        description: `${tierInfo.name} tier ${eventType} commission (${(effectiveRate * 100).toFixed(1)}%)`,
      },
    });
  } catch (error) {
    console.error("[Affiliate] Commission processing error:", error);
  }
}
