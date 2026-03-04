import { HttpError } from "wasp/server";
import { prisma } from "wasp/server";
import type {
  ApprovePost,
  RejectPost,
  ReworkPost,
  SchedulePost,
  ReschedulePost,
  MovePost,
  GetPostRevisions,
  RestoreRevision,
  PublishPostNow,
  CrossPostToSocial,
} from "wasp/server/operations";
import { publishToSocial } from "./publishers/socialPublisher";
import { publishToWordPress } from "./publishers/wordpressPublisher";
import OpenAI from "openai";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import { deductCredits, refundCredits } from "../../credits/creditService";
import { CreditActionType } from "../../credits/creditConfig";

// ---------------------------------------------------------------------------
// Extension guard — user needs at least one agent extension active
// ---------------------------------------------------------------------------

async function ensureAtLeastOneAgentExtension(
  userExtensionEntity: any,
  userId: string
): Promise<void> {
  const [socialExt, seoExt] = await Promise.all([
    userExtensionEntity.findUnique({
      where: {
        userId_extensionId: { userId, extensionId: "social-media-agent" },
      },
    }),
    userExtensionEntity.findUnique({
      where: {
        userId_extensionId: { userId, extensionId: "seo-agent" },
      },
    }),
  ]);

  if (!socialExt?.isActive && !seoExt?.isActive) {
    throw new HttpError(
      403,
      "You need at least one agent extension activated to manage posts."
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPostEntity(context: any, postType: "social" | "seo") {
  return postType === "social"
    ? context.entities.SocialMediaAgentPost
    : context.entities.SeoAgentPost;
}

async function getAndVerifyPost(
  context: any,
  postType: "social" | "seo",
  postId: string
) {
  const entity = getPostEntity(context, postType);
  const post = await entity.findUnique({ where: { id: postId } });

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  if (post.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  return post;
}

async function createRevision(
  context: any,
  data: {
    postType: string;
    postId: string;
    userId: string;
    action: string;
    statusFrom?: string;
    statusTo?: string;
    snapshot?: any;
    changedFields?: any;
    notes?: string;
  }
) {
  const revisionData: any = {
    postType: data.postType,
    userId: data.userId,
    action: data.action,
    statusFrom: data.statusFrom,
    statusTo: data.statusTo,
    snapshot: data.snapshot,
    changedFields: data.changedFields,
    notes: data.notes,
  };

  if (data.postType === "social") {
    revisionData.socialPostId = data.postId;
  } else {
    revisionData.seoPostId = data.postId;
  }

  return context.entities.PostRevision.create({ data: revisionData });
}

// ---------------------------------------------------------------------------
// OpenAI client helper
// ---------------------------------------------------------------------------

async function getOpenAIClient(settingEntity: any): Promise<OpenAI> {
  const setting = await settingEntity.findUnique({
    where: { key: "platform.openai_api_key" },
  });

  if (!setting?.value) {
    throw new HttpError(
      400,
      "OpenAI API key not configured. Go to Admin Settings to add your API key."
    );
  }

  return new OpenAI({ apiKey: setting.value });
}

// ---------------------------------------------------------------------------
// Brand Voice context builder (inline to avoid circular deps)
// ---------------------------------------------------------------------------

function buildBrandVoiceContext(company: any): string {
  if (!company) return "";

  const parts: string[] = [];
  if (company.name) parts.push(`Company: ${company.name}`);
  if (company.industry) parts.push(`Industry: ${company.industry}`);
  if (company.description) parts.push(`Description: ${company.description}`);
  if (company.targetAudience) parts.push(`Target Audience: ${company.targetAudience}`);
  if (company.toneOfVoice) parts.push(`Tone of Voice: ${company.toneOfVoice}`);
  if (company.tagline) parts.push(`Tagline: ${company.tagline}`);
  if (company.specificInstructions) parts.push(`Writing Rules: ${company.specificInstructions}`);

  if (company.products && company.products.length > 0) {
    const productLines = company.products.map((p: any) => {
      const typeLabel = p.type === 1 ? "Service" : p.type === 2 ? "Other" : "Product";
      let line = `- ${p.name} (${typeLabel})`;
      if (p.keyFeatures) line += `: ${p.keyFeatures}`;
      return line;
    });
    parts.push(`Products/Services:\n${productLines.join("\n")}`);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const postTypeEnum = z.enum(["social", "seo"]);

const approvePostSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
});

const rejectPostSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
  notes: z.string().optional(),
});

const reworkPostSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
  customPrompt: z.string().optional(),
});

const schedulePostSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
  scheduledAt: z.string(),
});

const reschedulePostSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
  scheduledAt: z.string(),
});

const movePostSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
  targetStatus: z.enum(["draft", "approved", "scheduled", "published"]),
});

const getPostRevisionsSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
});

const restoreRevisionSchema = z.object({
  revisionId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// 1. approvePost
// ---------------------------------------------------------------------------

export const approvePost: ApprovePost<
  z.infer<typeof approvePostSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(approvePostSchema, rawArgs);

  const post = await getAndVerifyPost(context, args.postType, args.postId);

  if (post.status !== "draft") {
    throw new HttpError(400, `Cannot approve a post with status "${post.status}". Post must be in "draft" status.`);
  }

  const entity = getPostEntity(context, args.postType);
  const updatedPost = await entity.update({
    where: { id: args.postId },
    data: {
      status: "approved",
      approvedAt: new Date(),
    },
  });

  await createRevision(context, {
    postType: args.postType,
    postId: args.postId,
    userId: context.user.id,
    action: "approved",
    statusFrom: "draft",
    statusTo: "approved",
  });

  return updatedPost;
};

// ---------------------------------------------------------------------------
// 2. rejectPost
// ---------------------------------------------------------------------------

export const rejectPost: RejectPost<
  z.infer<typeof rejectPostSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(rejectPostSchema, rawArgs);

  const post = await getAndVerifyPost(context, args.postType, args.postId);

  const entity = getPostEntity(context, args.postType);
  const updatedPost = await entity.update({
    where: { id: args.postId },
    data: {
      status: "draft",
      scheduledAt: null,
    },
  });

  await createRevision(context, {
    postType: args.postType,
    postId: args.postId,
    userId: context.user.id,
    action: "rejected",
    statusFrom: post.status,
    statusTo: "draft",
    notes: args.notes,
  });

  return updatedPost;
};

// ---------------------------------------------------------------------------
// 3. reworkPost
// ---------------------------------------------------------------------------

export const reworkPost: ReworkPost<
  z.infer<typeof reworkPostSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(reworkPostSchema, rawArgs);

  const post = await getAndVerifyPost(context, args.postType, args.postId);

  // Get OpenAI client
  const openai = await getOpenAIClient(context.entities.Setting);

  // Fetch the agent with company + products for brand voice context
  let agent: any;
  let brandVoiceContext = "";

  if (args.postType === "social") {
    agent = await context.entities.SocialMediaAgent.findUnique({
      where: { id: post.agentId },
      include: { company: { include: { products: true } } },
    });
  } else {
    agent = await context.entities.SeoAgent.findUnique({
      where: { id: post.agentId },
      include: { company: { include: { products: true } } },
    });
  }

  if (agent?.company) {
    brandVoiceContext = buildBrandVoiceContext(agent.company);
  }

  // Save old content for the revision snapshot
  const oldSnapshot =
    args.postType === "social"
      ? {
          content: post.content,
          hashtags: post.hashtags,
          platform: post.platform,
          status: post.status,
        }
      : {
          title: post.title,
          content: post.content,
          metaDescription: post.metaDescription,
          slug: post.slug,
          primaryKeyword: post.primaryKeyword,
          status: post.status,
        };

  // Deduct credits based on post type
  const reworkActionType = args.postType === "social"
    ? CreditActionType.ReworkSocial
    : CreditActionType.ReworkSeo;
  await deductCredits(prisma, context.user.id, reworkActionType, { postId: args.postId });

  // Build and call OpenAI
  let updatedPost: any;

  if (args.postType === "social") {
    // -----------------------------------------------------------------------
    // Rework social post
    // -----------------------------------------------------------------------
    const systemPrompt = [
      "You are an expert social media content creator. Rework the following social media post.",
      "",
      `Platform: ${post.platform}`,
      agent?.tone ? `Tone: ${agent.tone}` : "",
      agent?.creativityLevel ? `Creativity Level: ${agent.creativityLevel}/10` : "",
      agent?.hashtagCount ? `Hashtag Count: ${agent.hashtagCount}` : "",
      brandVoiceContext ? `\nBrand Voice:\n${brandVoiceContext}` : "",
      "",
      `Current post content:\n${post.content}`,
      post.hashtags ? `Current hashtags: ${post.hashtags}` : "",
      "",
      args.customPrompt
        ? `Rework instructions: ${args.customPrompt}`
        : "Improve the post while keeping the same topic and intent.",
      "",
      'Return a JSON object with exactly these fields:',
      '{ "content": "the reworked post text without hashtags", "hashtags": "#tag1 #tag2 ..." }',
    ]
      .filter((line) => line !== "")
      .join("\n");

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Rework this social media post." },
        ],
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });
    } catch (error) {
      await refundCredits(prisma, context.user.id, CreditActionType.ReworkSocial, "AI rework failed");
      throw error;
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      await refundCredits(prisma, context.user.id, CreditActionType.ReworkSocial, "Empty AI response");
      throw new HttpError(500, "OpenAI returned an empty response.");
    }

    let parsed: { content: string; hashtags?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(500, "Failed to parse AI response as JSON.");
    }

    if (!parsed.content) {
      throw new HttpError(500, "AI response is missing the 'content' field.");
    }

    const entity = getPostEntity(context, "social");
    updatedPost = await entity.update({
      where: { id: args.postId },
      data: {
        content: parsed.content,
        hashtags: parsed.hashtags || post.hashtags,
        status: "draft",
        aiMetadata: {
          model: "gpt-4o-mini",
          tokensUsed: completion.usage?.total_tokens ?? null,
          reworkedAt: new Date().toISOString(),
          reworkPrompt: args.customPrompt ?? null,
        },
      },
    });
  } else {
    // -----------------------------------------------------------------------
    // Rework SEO post
    // -----------------------------------------------------------------------
    const systemPrompt = `You are an expert SEO content writer. Rework the following article.

Current Title: ${post.title}
Current Content (truncated to first 3000 chars):
${post.content.substring(0, 3000)}
${post.metaDescription ? `Current Meta Description: ${post.metaDescription}` : ""}
${post.primaryKeyword ? `Primary Keyword: ${post.primaryKeyword}` : ""}
${agent?.tone ? `Tone: ${agent.tone}` : ""}
${agent?.targetWordCount ? `Target Word Count: ${agent.targetWordCount}` : ""}
${brandVoiceContext ? `\nBrand Voice:\n${brandVoiceContext}` : ""}
${args.customPrompt ? `\nRework instructions: ${args.customPrompt}` : "\nImprove the article while keeping the same topic, keyword focus, and intent."}

Requirements:
- Keep SEO optimization intact (keyword density, meta description, headings)
- Maintain or improve the article structure
- Write in HTML format (use <h2>, <h3>, <p>, <ul>, <li>, <strong> tags)

Return a JSON object:
{
  "title": "Reworked Article Title",
  "content": "<h2>...</h2><p>...</p>...",
  "metaDescription": "150-160 char description",
  "slug": "url-friendly-slug"
}`;

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Rework this SEO article." },
        ],
        max_tokens: 4096,
        response_format: { type: "json_object" },
      });
    } catch (error) {
      await refundCredits(prisma, context.user.id, CreditActionType.ReworkSeo, "AI rework failed");
      throw error;
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      await refundCredits(prisma, context.user.id, CreditActionType.ReworkSeo, "Empty AI response");
      throw new HttpError(500, "OpenAI returned an empty response.");
    }

    let parsed: {
      title: string;
      content: string;
      metaDescription?: string;
      slug?: string;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(500, "Failed to parse AI response as JSON.");
    }

    if (!parsed.title || !parsed.content) {
      throw new HttpError(
        500,
        "AI response is missing required fields (title, content)."
      );
    }

    const entity = getPostEntity(context, "seo");
    updatedPost = await entity.update({
      where: { id: args.postId },
      data: {
        title: parsed.title,
        content: parsed.content,
        metaDescription: parsed.metaDescription ?? post.metaDescription,
        slug: parsed.slug ?? post.slug,
        status: "draft",
        aiMetadata: {
          model: "gpt-4o-mini",
          tokensUsed: completion.usage?.total_tokens ?? null,
          reworkedAt: new Date().toISOString(),
          reworkPrompt: args.customPrompt ?? null,
        },
      },
    });
  }

  // Create revision
  await createRevision(context, {
    postType: args.postType,
    postId: args.postId,
    userId: context.user.id,
    action: "reworked",
    statusFrom: post.status,
    statusTo: "draft",
    snapshot: oldSnapshot,
    notes: args.customPrompt,
  });

  return updatedPost;
};

// ---------------------------------------------------------------------------
// 4. schedulePost
// ---------------------------------------------------------------------------

export const schedulePost: SchedulePost<
  z.infer<typeof schedulePostSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(schedulePostSchema, rawArgs);

  const post = await getAndVerifyPost(context, args.postType, args.postId);

  if (post.status !== "approved") {
    throw new HttpError(
      400,
      `Cannot schedule a post with status "${post.status}". Post must be "approved" first.`
    );
  }

  const scheduledAt = new Date(args.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    throw new HttpError(400, "Invalid scheduledAt date.");
  }

  const entity = getPostEntity(context, args.postType);
  const updatedPost = await entity.update({
    where: { id: args.postId },
    data: {
      status: "scheduled",
      scheduledAt,
    },
  });

  await createRevision(context, {
    postType: args.postType,
    postId: args.postId,
    userId: context.user.id,
    action: "scheduled",
    statusFrom: "approved",
    statusTo: "scheduled",
  });

  return updatedPost;
};

// ---------------------------------------------------------------------------
// 5. reschedulePost
// ---------------------------------------------------------------------------

export const reschedulePost: ReschedulePost<
  z.infer<typeof reschedulePostSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(reschedulePostSchema, rawArgs);

  const post = await getAndVerifyPost(context, args.postType, args.postId);

  if (post.status !== "scheduled") {
    throw new HttpError(
      400,
      `Cannot reschedule a post with status "${post.status}". Post must be "scheduled".`
    );
  }

  const scheduledAt = new Date(args.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    throw new HttpError(400, "Invalid scheduledAt date.");
  }

  const entity = getPostEntity(context, args.postType);
  const updatedPost = await entity.update({
    where: { id: args.postId },
    data: { scheduledAt },
  });

  await createRevision(context, {
    postType: args.postType,
    postId: args.postId,
    userId: context.user.id,
    action: "rescheduled",
    statusFrom: "scheduled",
    statusTo: "scheduled",
    notes: `Rescheduled from ${post.scheduledAt?.toISOString() ?? "unset"} to ${scheduledAt.toISOString()}`,
  });

  return updatedPost;
};

// ---------------------------------------------------------------------------
// 6. movePost (Kanban drag-and-drop)
// ---------------------------------------------------------------------------

export const movePost: MovePost<
  z.infer<typeof movePostSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(movePostSchema, rawArgs);

  const post = await getAndVerifyPost(context, args.postType, args.postId);

  if (post.status === args.targetStatus) {
    return post; // No-op if already in target status
  }

  const updateData: any = {
    status: args.targetStatus,
  };

  // Set approvedAt when moving to "approved"
  if (args.targetStatus === "approved") {
    updateData.approvedAt = new Date();
  }

  // Clear scheduledAt when moving back to draft or approved
  if (args.targetStatus === "draft" || args.targetStatus === "approved") {
    updateData.scheduledAt = null;
  }

  // Ensure scheduledAt exists when moving to "scheduled"
  if (args.targetStatus === "scheduled") {
    if (!post.scheduledAt) {
      // Default to tomorrow at 9:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      updateData.scheduledAt = tomorrow;
    }
  }

  const entity = getPostEntity(context, args.postType);
  const updatedPost = await entity.update({
    where: { id: args.postId },
    data: updateData,
  });

  await createRevision(context, {
    postType: args.postType,
    postId: args.postId,
    userId: context.user.id,
    action: "moved",
    statusFrom: post.status,
    statusTo: args.targetStatus,
  });

  return updatedPost;
};

// ---------------------------------------------------------------------------
// 7. getPostRevisions (Query)
// ---------------------------------------------------------------------------

export const getPostRevisions: GetPostRevisions<
  z.infer<typeof getPostRevisionsSchema>,
  any[]
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(
    getPostRevisionsSchema,
    rawArgs
  );

  // Verify the user owns the post
  await getAndVerifyPost(context, args.postType, args.postId);

  // Build the where clause based on postType
  const where: any = {};
  if (args.postType === "social") {
    where.socialPostId = args.postId;
  } else {
    where.seoPostId = args.postId;
  }

  return context.entities.PostRevision.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
};

// ---------------------------------------------------------------------------
// 8. restoreRevision
// ---------------------------------------------------------------------------

export const restoreRevision: RestoreRevision<
  z.infer<typeof restoreRevisionSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(
    restoreRevisionSchema,
    rawArgs
  );

  // Fetch the revision
  const revision = await context.entities.PostRevision.findUnique({
    where: { id: args.revisionId },
  });

  if (!revision) {
    throw new HttpError(404, "Revision not found");
  }

  if (revision.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized to access this revision");
  }

  if (!revision.snapshot) {
    throw new HttpError(
      400,
      "This revision has no snapshot to restore from."
    );
  }

  const snapshot = revision.snapshot as Record<string, any>;
  const postType = revision.postType as "social" | "seo";

  // Determine the post ID from the revision
  const postId = postType === "social" ? revision.socialPostId : revision.seoPostId;

  if (!postId) {
    throw new HttpError(400, "Revision is not linked to a post.");
  }

  // Verify current post ownership
  const currentPost = await getAndVerifyPost(context, postType, postId);

  // Build the update data from the snapshot
  const updateData: any = {};

  if (postType === "social") {
    if (snapshot.content !== undefined) updateData.content = snapshot.content;
    if (snapshot.hashtags !== undefined) updateData.hashtags = snapshot.hashtags;
    if (snapshot.platform !== undefined) updateData.platform = snapshot.platform;
    if (snapshot.imageUrl !== undefined) updateData.imageUrl = snapshot.imageUrl;
    if (snapshot.videoUrl !== undefined) updateData.videoUrl = snapshot.videoUrl;
    // Reset status to draft on restore
    updateData.status = "draft";
  } else {
    if (snapshot.title !== undefined) updateData.title = snapshot.title;
    if (snapshot.content !== undefined) updateData.content = snapshot.content;
    if (snapshot.metaDescription !== undefined) updateData.metaDescription = snapshot.metaDescription;
    if (snapshot.slug !== undefined) updateData.slug = snapshot.slug;
    if (snapshot.primaryKeyword !== undefined) updateData.primaryKeyword = snapshot.primaryKeyword;
    if (snapshot.secondaryKeywords !== undefined) updateData.secondaryKeywords = snapshot.secondaryKeywords;
    if (snapshot.faqSchema !== undefined) updateData.faqSchema = snapshot.faqSchema;
    // Reset status to draft on restore
    updateData.status = "draft";
  }

  const entity = getPostEntity(context, postType);
  const restoredPost = await entity.update({
    where: { id: postId },
    data: updateData,
  });

  // Create a new revision documenting the restore
  await createRevision(context, {
    postType,
    postId,
    userId: context.user.id,
    action: "restored",
    statusFrom: currentPost.status,
    statusTo: "draft",
    snapshot: {
      // Snapshot of the current post BEFORE the restore
      ...(postType === "social"
        ? {
            content: currentPost.content,
            hashtags: currentPost.hashtags,
            platform: currentPost.platform,
            status: currentPost.status,
          }
        : {
            title: currentPost.title,
            content: currentPost.content,
            metaDescription: currentPost.metaDescription,
            slug: currentPost.slug,
            primaryKeyword: currentPost.primaryKeyword,
            status: currentPost.status,
          }),
    },
    notes: `Restored from revision ${args.revisionId}`,
  });

  return restoredPost;
};

// ---------------------------------------------------------------------------
// Zod schemas for publish / cross-post
// ---------------------------------------------------------------------------

const publishPostNowSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
});

const crossPostToSocialSchema = z.object({
  seoPostId: z.string().uuid(),
  platforms: z.array(z.string()).min(1),
});

// ---------------------------------------------------------------------------
// 9. publishPostNow
// ---------------------------------------------------------------------------

export const publishPostNow: PublishPostNow<
  z.infer<typeof publishPostNowSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(publishPostNowSchema, rawArgs);

  const post = await getAndVerifyPost(context, args.postType, args.postId);

  if (post.status !== "approved" && post.status !== "scheduled") {
    throw new HttpError(
      400,
      `Cannot publish a post with status "${post.status}". Post must be "approved" or "scheduled".`
    );
  }

  const entity = getPostEntity(context, args.postType);
  let updatedPost: any;

  if (args.postType === "social") {
    // -----------------------------------------------------------------------
    // Publish social post
    // -----------------------------------------------------------------------
    const result = await publishToSocial(
      context.entities.SocialAccount,
      context.user.id,
      post.platform,
      post.content,
      post.imageUrl,
      post.socialAccountId
    );

    if (result.success) {
      updatedPost = await entity.update({
        where: { id: args.postId },
        data: {
          status: "published",
          publishedAt: new Date(),
          externalPostId: result.externalPostId ?? null,
        },
      });

      await createRevision(context, {
        postType: args.postType,
        postId: args.postId,
        userId: context.user.id,
        action: "published",
        statusFrom: post.status,
        statusTo: "published",
      });
    } else {
      updatedPost = await entity.update({
        where: { id: args.postId },
        data: {
          status: "failed",
          errorMessage: result.errorMessage ?? "Unknown publishing error",
        },
      });

      await createRevision(context, {
        postType: args.postType,
        postId: args.postId,
        userId: context.user.id,
        action: "publish_failed",
        statusFrom: post.status,
        statusTo: "failed",
        notes: result.errorMessage,
      });
    }
  } else {
    // -----------------------------------------------------------------------
    // Publish SEO post to WordPress
    // -----------------------------------------------------------------------
    const agent = await context.entities.SeoAgent.findUnique({
      where: { id: post.agentId },
    });

    if (!agent) {
      throw new HttpError(404, "SEO agent not found for this post.");
    }

    if (!agent.wpUrl || !agent.wpUsername || !agent.wpPassword) {
      throw new HttpError(
        400,
        "WordPress not configured for this SEO agent. Set WP URL, username, and password in agent settings."
      );
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
      updatedPost = await entity.update({
        where: { id: args.postId },
        data: {
          status: "published",
          wpPostId: result.wpPostId ?? null,
          externalPostUrl: result.externalPostUrl ?? null,
          publishedAt: new Date(),
        },
      });

      await createRevision(context, {
        postType: args.postType,
        postId: args.postId,
        userId: context.user.id,
        action: "published",
        statusFrom: post.status,
        statusTo: "published",
      });
    } else {
      updatedPost = await entity.update({
        where: { id: args.postId },
        data: {
          status: "failed",
          errorMessage: result.errorMessage ?? "Unknown WordPress publishing error",
        },
      });

      await createRevision(context, {
        postType: args.postType,
        postId: args.postId,
        userId: context.user.id,
        action: "publish_failed",
        statusFrom: post.status,
        statusTo: "failed",
        notes: result.errorMessage,
      });
    }
  }

  return updatedPost;
};

// ---------------------------------------------------------------------------
// 10. crossPostToSocial
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags from a string, returning plain text.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export const crossPostToSocial: CrossPostToSocial<
  z.infer<typeof crossPostToSocialSchema>,
  any[]
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(
    crossPostToSocialSchema,
    rawArgs
  );

  // Fetch and verify ownership of the SEO post
  const seoPost = await getAndVerifyPost(context, "seo", args.seoPostId);

  if (!seoPost.content) {
    throw new HttpError(400, "SEO post has no content to cross-post.");
  }

  // Generate a social-friendly excerpt: title + first 200 chars of plain text content
  const plainContent = stripHtmlTags(seoPost.content);
  const excerpt = seoPost.title
    ? `${seoPost.title}\n\n${plainContent.substring(0, 200)}${plainContent.length > 200 ? "..." : ""}`
    : plainContent.substring(0, 280);

  // Find the user's first SocialMediaAgent (prefer one matching the same companyId)
  let socialAgent: any = null;

  if (seoPost.agentId) {
    // Get the SEO agent to find its companyId
    const seoAgent = await context.entities.SeoAgent.findUnique({
      where: { id: seoPost.agentId },
    });

    if (seoAgent?.companyId) {
      // Try to find a social agent linked to the same company
      socialAgent = await context.entities.SocialMediaAgent.findFirst({
        where: { userId: context.user.id, companyId: seoAgent.companyId },
      });
    }
  }

  // Fallback: find any social agent owned by the user
  if (!socialAgent) {
    socialAgent = await context.entities.SocialMediaAgent.findFirst({
      where: { userId: context.user.id },
    });
  }

  if (!socialAgent) {
    throw new HttpError(
      400,
      "No Social Media Agent found. Create one before cross-posting."
    );
  }

  const createdPosts: any[] = [];

  for (const platform of args.platforms) {
    const newPost = await context.entities.SocialMediaAgentPost.create({
      data: {
        agentId: socialAgent.id,
        userId: context.user.id,
        content: excerpt,
        platform,
        status: "draft",
      },
    });

    await createRevision(context, {
      postType: "social",
      postId: newPost.id,
      userId: context.user.id,
      action: "cross_posted",
      statusTo: "draft",
      notes: `Cross-posted from SEO post: ${seoPost.title ?? seoPost.id}`,
    });

    createdPosts.push(newPost);
  }

  return createdPosts;
};
