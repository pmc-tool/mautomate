import { HttpError } from "wasp/server";
import type { GetDashboardStats } from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

// ---------------------------------------------------------------------------
// Extension guard (same pattern as postHubOperations.ts)
// ---------------------------------------------------------------------------

async function ensureAtLeastOneAgentExtension(
  userExtensionEntity: any,
  userId: string
): Promise<{ hasSocial: boolean; hasSeo: boolean }> {
  const [socialExt, seoExt] = await Promise.all([
    userExtensionEntity.findUnique({
      where: { userId_extensionId: { userId, extensionId: "social-media-agent" } },
    }),
    userExtensionEntity.findUnique({
      where: { userId_extensionId: { userId, extensionId: "seo-agent" } },
    }),
  ]);

  const hasSocial = !!socialExt?.isActive;
  const hasSeo = !!seoExt?.isActive;

  if (!hasSocial && !hasSeo) {
    throw new HttpError(
      403,
      "You need at least one agent extension (Social Media Agent or SEO Agent) activated to view the dashboard."
    );
  }

  return { hasSocial, hasSeo };
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const getDashboardStatsSchema = z.object({
  dateRange: z.enum(["7d", "30d", "90d"]).default("30d"),
  postType: z.enum(["all", "social", "seo"]).default("all"),
  platform: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRangeDays(range: "7d" | "30d" | "90d"): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function computeDelta(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Query: getDashboardStats
// ---------------------------------------------------------------------------

export const getDashboardStats: GetDashboardStats<any, any> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const { hasSocial, hasSeo } = await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(getDashboardStatsSchema, rawArgs);
  const { dateRange, postType, platform } = args;

  const days = getDateRangeDays(dateRange);
  const now = new Date();
  const currentStart = startOfDay(new Date(now.getTime() - days * 86400000));
  const priorStart = startOfDay(new Date(currentStart.getTime() - days * 86400000));

  // -------------------------------------------------------------------------
  // Fetch posts for current + prior periods
  // -------------------------------------------------------------------------

  let socialPosts: any[] = [];
  let priorSocialPosts: any[] = [];

  if (hasSocial && (postType === "all" || postType === "social")) {
    const baseWhere: any = { userId: context.user.id };
    if (platform) baseWhere.platform = platform;

    [socialPosts, priorSocialPosts] = await Promise.all([
      context.entities.SocialMediaAgentPost.findMany({
        where: { ...baseWhere, createdAt: { gte: currentStart } },
        select: {
          id: true, status: true, platform: true, createdAt: true,
          publishedAt: true, scheduledAt: true, errorMessage: true,
        },
      }),
      context.entities.SocialMediaAgentPost.findMany({
        where: { ...baseWhere, createdAt: { gte: priorStart, lt: currentStart } },
        select: { id: true, status: true },
      }),
    ]);
  }

  let seoPosts: any[] = [];
  let priorSeoPosts: any[] = [];

  if (hasSeo && (postType === "all" || postType === "seo")) {
    const baseWhere: any = { userId: context.user.id };
    if (platform) baseWhere.contentType = platform;

    [seoPosts, priorSeoPosts] = await Promise.all([
      context.entities.SeoAgentPost.findMany({
        where: { ...baseWhere, createdAt: { gte: currentStart } },
        select: {
          id: true, status: true, contentType: true, seoScore: true,
          createdAt: true, publishedAt: true, scheduledAt: true, errorMessage: true,
        },
      }),
      context.entities.SeoAgentPost.findMany({
        where: { ...baseWhere, createdAt: { gte: priorStart, lt: currentStart } },
        select: { id: true, status: true },
      }),
    ]);
  }

  const allCurrent = [...socialPosts, ...seoPosts];
  const allPrior = [...priorSocialPosts, ...priorSeoPosts];

  // -------------------------------------------------------------------------
  // KPIs
  // -------------------------------------------------------------------------

  const curCreated = allCurrent.length;
  const curPublished = allCurrent.filter((p) => p.status === "published").length;
  const curApproved = allCurrent.filter((p) =>
    ["approved", "scheduled", "published"].includes(p.status)
  ).length;
  const curFailed = allCurrent.filter((p) => p.status === "failed").length;
  const curApprovalRate = curCreated > 0 ? Math.round((curApproved / curCreated) * 100) : 0;

  const priorCreated = allPrior.length;
  const priorPublished = allPrior.filter((p) => p.status === "published").length;
  const priorApproved = allPrior.filter((p) =>
    ["approved", "scheduled", "published"].includes(p.status)
  ).length;
  const priorFailed = allPrior.filter((p) => p.status === "failed").length;
  const priorApprovalRate = priorCreated > 0 ? Math.round((priorApproved / priorCreated) * 100) : 0;

  const kpis = {
    postsCreated: { value: curCreated, delta: computeDelta(curCreated, priorCreated) },
    postsPublished: { value: curPublished, delta: computeDelta(curPublished, priorPublished) },
    approvalRate: { value: curApprovalRate, delta: computeDelta(curApprovalRate, priorApprovalRate) },
    failedPosts: { value: curFailed, delta: computeDelta(curFailed, priorFailed) },
  };

  // -------------------------------------------------------------------------
  // Daily Trend
  // -------------------------------------------------------------------------

  const dailyMap = new Map<string, { created: number; published: number }>();

  // Initialize all days in range
  for (let i = 0; i < days; i++) {
    const d = new Date(currentStart.getTime() + i * 86400000);
    dailyMap.set(formatDate(d), { created: 0, published: 0 });
  }

  for (const post of allCurrent) {
    const dayKey = formatDate(new Date(post.createdAt));
    const entry = dailyMap.get(dayKey);
    if (entry) {
      entry.created++;
    }
    if (post.publishedAt) {
      const pubKey = formatDate(new Date(post.publishedAt));
      const pubEntry = dailyMap.get(pubKey);
      if (pubEntry) {
        pubEntry.published++;
      }
    }
  }

  const dailyTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  // -------------------------------------------------------------------------
  // Channel Performance
  // -------------------------------------------------------------------------

  const channelMap = new Map<
    string,
    {
      channel: string;
      postType: "social" | "seo";
      total: number;
      published: number;
      scheduled: number;
      failed: number;
      seoScoreSum: number;
      seoScoreCount: number;
    }
  >();

  for (const post of socialPosts) {
    const key = `social:${post.platform}`;
    if (!channelMap.has(key)) {
      channelMap.set(key, {
        channel: post.platform,
        postType: "social",
        total: 0, published: 0, scheduled: 0, failed: 0,
        seoScoreSum: 0, seoScoreCount: 0,
      });
    }
    const ch = channelMap.get(key)!;
    ch.total++;
    if (post.status === "published") ch.published++;
    if (post.status === "scheduled") ch.scheduled++;
    if (post.status === "failed") ch.failed++;
  }

  for (const post of seoPosts) {
    const key = `seo:${post.contentType}`;
    if (!channelMap.has(key)) {
      channelMap.set(key, {
        channel: post.contentType,
        postType: "seo",
        total: 0, published: 0, scheduled: 0, failed: 0,
        seoScoreSum: 0, seoScoreCount: 0,
      });
    }
    const ch = channelMap.get(key)!;
    ch.total++;
    if (post.status === "published") ch.published++;
    if (post.status === "scheduled") ch.scheduled++;
    if (post.status === "failed") ch.failed++;
    if (post.seoScore != null) {
      ch.seoScoreSum += post.seoScore;
      ch.seoScoreCount++;
    }
  }

  const channels = Array.from(channelMap.values())
    .map((ch) => ({
      channel: ch.channel,
      postType: ch.postType,
      total: ch.total,
      published: ch.published,
      scheduled: ch.scheduled,
      failed: ch.failed,
      avgSeoScore: ch.seoScoreCount > 0 ? Math.round(ch.seoScoreSum / ch.seoScoreCount) : null,
      publishRate: ch.total > 0 ? Math.round((ch.published / ch.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // -------------------------------------------------------------------------
  // Action Items
  // -------------------------------------------------------------------------

  const actionItems: Array<{
    type: string;
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    count: number;
    link: string;
  }> = [];

  // Rule 1: Failed posts
  const failedPosts = allCurrent.filter((p) => p.status === "failed");
  if (failedPosts.length > 0) {
    actionItems.push({
      type: "failed_posts",
      severity: "high",
      title: `${failedPosts.length} post${failedPosts.length > 1 ? "s" : ""} failed to publish`,
      description: "Review failed posts and retry or fix the issues.",
      count: failedPosts.length,
      link: "/post-hub?status=failed",
    });
  }

  // Rule 2: Expired schedule (scheduledAt in past, still status=scheduled)
  const expiredPosts = allCurrent.filter(
    (p) => p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) < now
  );
  if (expiredPosts.length > 0) {
    actionItems.push({
      type: "expired_schedule",
      severity: "high",
      title: `${expiredPosts.length} post${expiredPosts.length > 1 ? "s" : ""} missed their schedule`,
      description: "These posts were scheduled but not published. Reschedule or publish now.",
      count: expiredPosts.length,
      link: "/post-hub?status=scheduled",
    });
  }

  // Rule 3: Stale drafts (drafts older than 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  // For stale drafts, we need all drafts (not just in the date range)
  let allDrafts: any[] = [];
  if (hasSocial && (postType === "all" || postType === "social")) {
    const socialDrafts = await context.entities.SocialMediaAgentPost.findMany({
      where: { userId: context.user.id, status: "draft", createdAt: { lt: sevenDaysAgo } },
      select: { id: true },
    });
    allDrafts.push(...socialDrafts);
  }
  if (hasSeo && (postType === "all" || postType === "seo")) {
    const seoDrafts = await context.entities.SeoAgentPost.findMany({
      where: { userId: context.user.id, status: "draft", createdAt: { lt: sevenDaysAgo } },
      select: { id: true },
    });
    allDrafts.push(...seoDrafts);
  }
  if (allDrafts.length > 0) {
    actionItems.push({
      type: "stale_drafts",
      severity: "medium",
      title: `${allDrafts.length} draft${allDrafts.length > 1 ? "s" : ""} sitting idle for 7+ days`,
      description: "Review and approve or discard old draft posts.",
      count: allDrafts.length,
      link: "/post-hub?status=draft",
    });
  }

  // Rule 4: Pending approval (approved but not scheduled)
  const pendingSchedule = allCurrent.filter((p) => p.status === "approved");
  if (pendingSchedule.length > 0) {
    actionItems.push({
      type: "pending_approval",
      severity: "medium",
      title: `${pendingSchedule.length} approved post${pendingSchedule.length > 1 ? "s" : ""} awaiting scheduling`,
      description: "Schedule these approved posts for publishing.",
      count: pendingSchedule.length,
      link: "/post-hub?status=approved",
    });
  }

  // Rule 5: No posts this week
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const postsThisWeek = allCurrent.filter((p) => new Date(p.createdAt) >= oneWeekAgo);
  if (postsThisWeek.length === 0) {
    actionItems.push({
      type: "no_posts_this_week",
      severity: "medium",
      title: "No new posts this week",
      description: "Keep your content pipeline active by creating new posts.",
      count: 0,
      link: "/post-hub",
    });
  }

  // Rule 6: Low SEO score
  const lowSeoScorePosts = seoPosts.filter((p) => p.seoScore != null && p.seoScore < 60);
  if (lowSeoScorePosts.length > 0) {
    actionItems.push({
      type: "low_seo_score",
      severity: "low",
      title: `${lowSeoScorePosts.length} SEO post${lowSeoScorePosts.length > 1 ? "s" : ""} scoring below 60`,
      description: "Improve these posts to boost their SEO performance.",
      count: lowSeoScorePosts.length,
      link: "/post-hub?postType=seo",
    });
  }

  return { kpis, dailyTrend, channels, actionItems };
};
