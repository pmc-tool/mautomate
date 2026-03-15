/**
 * PgBoss scheduled job: runs every 5 minutes.
 * Finds posts with status=scheduled and scheduledAt <= now, publishes them.
 *
 * Declared in main.wasp:
 *   job publishScheduledPosts {
 *     executor: PgBoss,
 *     perform: { fn: import { publishScheduledPosts } from "@src/extensions/shared/publishingJob" },
 *     schedule: { cron: "every 5 minutes" },
 *     entities: [SocialMediaAgentPost, SeoAgentPost, SocialMediaAgent, SeoAgent, PostRevision, SocialAccount, Setting]
 *   }
 */

import { publishToSocial } from "./publishers/socialPublisher";
import { publishToWordPress } from "./publishers/wordpressPublisher";
import { logAudit } from "../../server/auditLog";

// ---------------------------------------------------------------------------
// Main job handler
// ---------------------------------------------------------------------------

export async function publishScheduledPosts(_args: unknown, context: any) {
  const now = new Date();

  console.log(`[publishScheduledPosts] Running at ${now.toISOString()}`);

  // -------------------------------------------------------------------------
  // 1. Fetch all scheduled posts that are due
  // -------------------------------------------------------------------------

  const [socialPosts, seoPosts] = await Promise.all([
    context.entities.SocialMediaAgentPost.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: now },
      },
      include: { agent: true },
    }),
    context.entities.SeoAgentPost.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: now },
      },
      include: { agent: true },
    }),
  ]);

  console.log(
    `[publishScheduledPosts] Found ${socialPosts.length} social post(s) and ${seoPosts.length} SEO post(s) due for publishing.`
  );

  let publishedCount = 0;
  let failedCount = 0;

  // -------------------------------------------------------------------------
  // 2. Publish social media posts
  // -------------------------------------------------------------------------

  for (const post of socialPosts) {
    try {
      // Build full content with hashtags
      const fullContent = post.hashtags
        ? `${post.content}\n\n${post.hashtags}`
        : post.content;

      const result = await publishToSocial(
        context.entities.SocialAccount,
        post.userId,
        post.platform,
        fullContent,
        post.imageUrl,
        post.socialAccountId
      );

      if (result.success) {
        await context.entities.SocialMediaAgentPost.update({
          where: { id: post.id },
          data: {
            status: "published",
            publishedAt: now,
            externalPostId: result.externalPostId || null,
            errorMessage: null,
          },
        });

        await createRevision(context, {
          postType: "social",
          postId: post.id,
          userId: post.userId,
          action: "published",
          statusFrom: "scheduled",
          statusTo: "published",
          notes: result.externalPostId
            ? `Published successfully. External ID: ${result.externalPostId}`
            : "Published successfully.",
        });

        publishedCount++;
        logAudit({ userId: post.userId, action: "post.publish", resource: `social:${post.id}`, detail: post.platform });
        console.log(
          `[publishScheduledPosts] Social post ${post.id} published to ${post.platform}.`
        );
      } else {
        await context.entities.SocialMediaAgentPost.update({
          where: { id: post.id },
          data: {
            status: "failed",
            errorMessage: result.errorMessage || "Unknown error",
          },
        });

        await createRevision(context, {
          postType: "social",
          postId: post.id,
          userId: post.userId,
          action: "publish_failed",
          statusFrom: "scheduled",
          statusTo: "failed",
          notes: result.errorMessage || "Unknown publishing error",
        });

        failedCount++;
        logAudit({ userId: post.userId, action: "post.fail", resource: `social:${post.id}`, detail: result.errorMessage });
        console.error(
          `[publishScheduledPosts] Social post ${post.id} failed: ${result.errorMessage}`
        );
      }
    } catch (err: any) {
      // Catch unexpected errors so the batch continues
      await context.entities.SocialMediaAgentPost.update({
        where: { id: post.id },
        data: {
          status: "failed",
          errorMessage: err.message || "Unexpected error during publishing",
        },
      });

      await createRevision(context, {
        postType: "social",
        postId: post.id,
        userId: post.userId,
        action: "publish_failed",
        statusFrom: "scheduled",
        statusTo: "failed",
        notes: err.message || "Unexpected error during publishing",
      });

      failedCount++;
      console.error(
        `[publishScheduledPosts] Social post ${post.id} threw error:`,
        err
      );
    }
  }

  // -------------------------------------------------------------------------
  // 3. Publish SEO posts to WordPress
  // -------------------------------------------------------------------------

  for (const post of seoPosts) {
    try {
      const agent = post.agent;

      // Check if WordPress is configured on the agent
      if (!agent?.wpUrl || !agent?.wpUsername || !agent?.wpPassword) {
        console.warn(
          `[publishScheduledPosts] SEO post ${post.id} skipped: agent "${agent?.name || post.agentId}" has no WordPress credentials configured.`
        );

        // Don't mark as failed -- leave as scheduled so it can be retried after config
        await createRevision(context, {
          postType: "seo",
          postId: post.id,
          userId: post.userId,
          action: "publish_failed",
          statusFrom: "scheduled",
          statusTo: "scheduled",
          notes:
            "WordPress credentials not configured on the SEO agent. Post remains scheduled.",
        });

        continue;
      }

      const result = await publishToWordPress(
        agent.wpUrl,
        agent.wpUsername,
        agent.wpPassword,
        post.title,
        post.content,
        post.slug,
        post.metaDescription,
        agent.wpCategoryId
      );

      if (result.success) {
        await context.entities.SeoAgentPost.update({
          where: { id: post.id },
          data: {
            status: "published",
            publishedAt: now,
            wpPostId: result.wpPostId || null,
            externalPostUrl: result.externalPostUrl || null,
            errorMessage: null,
          },
        });

        await createRevision(context, {
          postType: "seo",
          postId: post.id,
          userId: post.userId,
          action: "published",
          statusFrom: "scheduled",
          statusTo: "published",
          notes: result.externalPostUrl
            ? `Published to WordPress: ${result.externalPostUrl}`
            : "Published to WordPress successfully.",
        });

        publishedCount++;
        logAudit({ userId: post.userId, action: "post.publish", resource: `seo:${post.id}`, detail: `WordPress ID: ${result.wpPostId}` });
        console.log(
          `[publishScheduledPosts] SEO post ${post.id} published to WordPress (WP ID: ${result.wpPostId}).`
        );
      } else {
        await context.entities.SeoAgentPost.update({
          where: { id: post.id },
          data: {
            status: "failed",
            errorMessage: result.errorMessage || "Unknown WordPress error",
          },
        });

        await createRevision(context, {
          postType: "seo",
          postId: post.id,
          userId: post.userId,
          action: "publish_failed",
          statusFrom: "scheduled",
          statusTo: "failed",
          notes: result.errorMessage || "Unknown WordPress publishing error",
        });

        failedCount++;
        console.error(
          `[publishScheduledPosts] SEO post ${post.id} failed: ${result.errorMessage}`
        );
      }
    } catch (err: any) {
      // Catch unexpected errors so the batch continues
      await context.entities.SeoAgentPost.update({
        where: { id: post.id },
        data: {
          status: "failed",
          errorMessage: err.message || "Unexpected error during WordPress publishing",
        },
      });

      await createRevision(context, {
        postType: "seo",
        postId: post.id,
        userId: post.userId,
        action: "publish_failed",
        statusFrom: "scheduled",
        statusTo: "failed",
        notes: err.message || "Unexpected error during WordPress publishing",
      });

      failedCount++;
      console.error(
        `[publishScheduledPosts] SEO post ${post.id} threw error:`,
        err
      );
    }
  }

  // -------------------------------------------------------------------------
  // 4. Summary
  // -------------------------------------------------------------------------

  console.log(
    `[publishScheduledPosts] Completed. Published: ${publishedCount}, Failed: ${failedCount}, Total processed: ${socialPosts.length + seoPosts.length}`
  );
}

// ---------------------------------------------------------------------------
// Helper: create a PostRevision record
// ---------------------------------------------------------------------------

async function createRevision(
  context: any,
  data: {
    postType: string;
    postId: string;
    userId: string;
    action: string;
    statusFrom?: string;
    statusTo?: string;
    notes?: string;
  }
) {
  const revisionData: any = {
    postType: data.postType,
    userId: data.userId,
    action: data.action,
    statusFrom: data.statusFrom,
    statusTo: data.statusTo,
    notes: data.notes,
  };

  if (data.postType === "social") {
    revisionData.socialPostId = data.postId;
  } else {
    revisionData.seoPostId = data.postId;
  }

  return context.entities.PostRevision.create({ data: revisionData });
}
