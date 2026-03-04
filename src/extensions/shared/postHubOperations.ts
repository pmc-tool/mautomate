import { HttpError } from "wasp/server";
import type { GetAllPosts } from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";

// ---------------------------------------------------------------------------
// Extension guard — user needs at least one agent extension active
// ---------------------------------------------------------------------------

async function ensureAtLeastOneAgentExtension(
  userExtensionEntity: any,
  userId: string
): Promise<{ hasSocial: boolean; hasSeo: boolean }> {
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

  const hasSocial = !!socialExt?.isActive;
  const hasSeo = !!seoExt?.isActive;

  if (!hasSocial && !hasSeo) {
    throw new HttpError(
      403,
      "You need at least one agent extension (Social Media Agent or SEO Agent) activated to use the Post Hub."
    );
  }

  return { hasSocial, hasSeo };
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const getAllPostsSchema = z.object({
  postType: z.enum(["social", "seo", "all"]).default("all"),
  status: z
    .enum(["draft", "approved", "scheduled", "published", "failed"])
    .optional(),
  platform: z.string().optional(),
  agentId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "scheduledAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------
// Query: getAllPosts
// ---------------------------------------------------------------------------

export const getAllPosts: GetAllPosts<any, any> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const { hasSocial, hasSeo } = await ensureAtLeastOneAgentExtension(
    context.entities.UserExtension,
    context.user.id
  );

  const args = ensureArgsSchemaOrThrowHttpError(getAllPostsSchema, rawArgs);

  const { postType, status, platform, agentId, search, sortBy, sortOrder, page, limit } = args;

  // -------------------------------------------------------------------------
  // Fetch social posts
  // -------------------------------------------------------------------------

  let socialPosts: any[] = [];

  if (hasSocial && (postType === "all" || postType === "social")) {
    const socialWhere: any = { userId: context.user.id };

    if (status) socialWhere.status = status;
    if (platform) socialWhere.platform = platform;
    if (agentId) socialWhere.agentId = agentId;
    if (search) {
      socialWhere.content = { contains: search, mode: "insensitive" };
    }

    socialPosts = await context.entities.SocialMediaAgentPost.findMany({
      where: socialWhere,
      include: {
        agent: { select: { id: true, name: true } },
        socialAccount: { select: { displayName: true, platformUsername: true } },
      },
      orderBy: { [sortBy]: sortOrder },
    });
  }

  // -------------------------------------------------------------------------
  // Fetch SEO posts
  // -------------------------------------------------------------------------

  let seoPosts: any[] = [];

  if (hasSeo && (postType === "all" || postType === "seo")) {
    const seoWhere: any = { userId: context.user.id };

    if (status) seoWhere.status = status;
    if (platform) seoWhere.contentType = platform; // platform maps to contentType for SEO
    if (agentId) seoWhere.agentId = agentId;
    if (search) {
      seoWhere.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    seoPosts = await context.entities.SeoAgentPost.findMany({
      where: seoWhere,
      include: { agent: { select: { id: true, name: true } } },
      orderBy: { [sortBy]: sortOrder },
    });
  }

  // -------------------------------------------------------------------------
  // Normalize into UnifiedPost shape
  // -------------------------------------------------------------------------

  const normalizedSocial = socialPosts.map((p: any) => ({
    id: p.id,
    postType: "social" as const,
    title: p.content.length > 80 ? p.content.substring(0, 80) + "..." : p.content,
    content: p.content,
    status: p.status,
    platform: p.platform,
    agentId: p.agentId,
    agentName: p.agent?.name ?? "Unknown Agent",
    seoScore: null,
    aeoScore: null,
    socialAccountId: p.socialAccountId ?? null,
    socialAccountName: p.socialAccount?.displayName ?? p.socialAccount?.platformUsername ?? null,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  const normalizedSeo = seoPosts.map((p: any) => ({
    id: p.id,
    postType: "seo" as const,
    title: p.title,
    content: p.content,
    status: p.status,
    platform: p.contentType,
    agentId: p.agentId,
    agentName: p.agent?.name ?? "Unknown Agent",
    seoScore: p.seoScore ?? null,
    aeoScore: p.aeoScore ?? null,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  // -------------------------------------------------------------------------
  // Merge, sort, and paginate
  // -------------------------------------------------------------------------

  const allPosts = [...normalizedSocial, ...normalizedSeo];

  // Sort the merged array by the requested field
  allPosts.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    // Handle nulls (scheduledAt can be null)
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortOrder === "asc" ? -1 : 1;
    if (bVal == null) return sortOrder === "asc" ? 1 : -1;

    const aTime = new Date(aVal as string).getTime();
    const bTime = new Date(bVal as string).getTime();

    return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
  });

  const total = allPosts.length;
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const paginated = allPosts.slice(skip, skip + limit);

  return {
    posts: paginated,
    total,
    page,
    totalPages,
  };
};
