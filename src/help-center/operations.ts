import { HttpError } from "wasp/server";
import type {
  GetPublishedHelpArticles,
  GetPublishedHelpArticleBySlug,
  GetAdminHelpArticles,
  GetAdminHelpArticleById,
  CreateHelpArticle,
  UpdateHelpArticle,
  DeleteHelpArticle,
  SetHelpArticleStatus,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const ARTICLE_STATUSES = ["draft", "scheduled", "published", "archived"] as const;

const listAdminArticlesSchema = z
  .object({
    search: z.string().optional(),
    status: z.enum(ARTICLE_STATUSES).optional(),
    category: z.string().optional(),
  })
  .optional();

const idSchema = z.object({ id: z.string().uuid() });
const slugSchema = z.object({ slug: z.string().min(1) });

const helpArticleInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1).optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1, "Content is required"),
  coverImageUrl: z.string().url().optional().nullable(),
  category: z.string().min(1).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  status: z.enum(ARTICLE_STATUSES).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
});

const updateHelpArticleSchema = helpArticleInputSchema.extend({
  id: z.string().uuid(),
});

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ARTICLE_STATUSES),
});

function assertAuthenticatedUser(context: any) {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }
}

function assertAdmin(context: any) {
  assertAuthenticatedUser(context);
  if (!context.user.isAdmin) {
    throw new HttpError(403, "Admin access required");
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(
  entities: any,
  title: string,
  providedSlug?: string,
  excludeId?: string,
) {
  const baseSlug = slugify(providedSlug || title) || "article";

  let candidate = baseSlug;
  let i = 1;

  while (true) {
    const existing = await entities.HelpArticle.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${baseSlug}-${i++}`;
  }
}

function getPublishedAt(status: string, publishedAtRaw?: string | null) {
  if (status === "published") {
    return publishedAtRaw ? new Date(publishedAtRaw) : new Date();
  }

  if (status === "scheduled" && publishedAtRaw) {
    return new Date(publishedAtRaw);
  }

  return null;
}

export const getPublishedHelpArticles: GetPublishedHelpArticles<void, any[]> = async (_args, context) => {
  return context.entities.HelpArticle.findMany({
    where: {
      status: "published",
      publishedAt: { lte: new Date() },
    },
    orderBy: [{ category: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
      createdAt: true,
      seoTitle: true,
      seoDescription: true,
      author: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });
};

export const getPublishedHelpArticleBySlug: GetPublishedHelpArticleBySlug<{ slug: string }, any> = async (
  rawArgs,
  context,
) => {
  const args = ensureArgsSchemaOrThrowHttpError(slugSchema, rawArgs);

  const article = await context.entities.HelpArticle.findFirst({
    where: {
      slug: args.slug,
      status: "published",
      publishedAt: { lte: new Date() },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      seoTitle: true,
      seoDescription: true,
      author: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  if (!article) {
    throw new HttpError(404, "Article not found");
  }

  return article;
};

export const getAdminHelpArticles: GetAdminHelpArticles<any, any[]> = async (rawArgs, context) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(listAdminArticlesSchema, rawArgs);

  return context.entities.HelpArticle.findMany({
    where: {
      ...(args?.search
        ? {
            OR: [
              { title: { contains: args.search, mode: "insensitive" } },
              { slug: { contains: args.search, mode: "insensitive" } },
              { excerpt: { contains: args.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(args?.status ? { status: args.status } : {}),
      ...(args?.category ? { category: args.category } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });
};

export const getAdminHelpArticleById: GetAdminHelpArticleById<{ id: string }, any> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);

  const article = await context.entities.HelpArticle.findUnique({
    where: { id: args.id },
  });

  if (!article) {
    throw new HttpError(404, "Article not found");
  }

  return article;
};

export const createHelpArticle: CreateHelpArticle<z.infer<typeof helpArticleInputSchema>, any> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);
  const currentUser = context.user!;

  const args = ensureArgsSchemaOrThrowHttpError(helpArticleInputSchema, rawArgs);

  const slug = await generateUniqueSlug(context.entities, args.title, args.slug);
  const status = args.status ?? "draft";

  return context.entities.HelpArticle.create({
    data: {
      authorId: currentUser.id,
      title: args.title,
      slug,
      excerpt: args.excerpt ?? null,
      content: args.content,
      coverImageUrl: args.coverImageUrl ?? null,
      category: args.category || "General",
      status,
      publishedAt: getPublishedAt(status, args.publishedAt ?? null),
      seoTitle: args.seoTitle ?? null,
      seoDescription: args.seoDescription ?? null,
    },
  });
};

export const updateHelpArticle: UpdateHelpArticle<z.infer<typeof updateHelpArticleSchema>, any> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(updateHelpArticleSchema, rawArgs);

  const existing = await context.entities.HelpArticle.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, "Article not found");
  }

  const slug = await generateUniqueSlug(context.entities, args.title, args.slug, args.id);
  const status = args.status ?? existing.status;

  return context.entities.HelpArticle.update({
    where: { id: args.id },
    data: {
      title: args.title,
      slug,
      excerpt: args.excerpt ?? null,
      content: args.content,
      coverImageUrl: args.coverImageUrl ?? null,
      category: args.category || "General",
      status,
      publishedAt: getPublishedAt(status, args.publishedAt ?? null),
      seoTitle: args.seoTitle ?? null,
      seoDescription: args.seoDescription ?? null,
    },
  });
};

export const deleteHelpArticle: DeleteHelpArticle<{ id: string }, void> = async (rawArgs, context) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);

  const existing = await context.entities.HelpArticle.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, "Article not found");
  }

  await context.entities.HelpArticle.delete({ where: { id: args.id } });
};

export const setHelpArticleStatus: SetHelpArticleStatus<z.infer<typeof setStatusSchema>, any> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(setStatusSchema, rawArgs);

  const existing = await context.entities.HelpArticle.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, "Article not found");
  }

  return context.entities.HelpArticle.update({
    where: { id: args.id },
    data: {
      status: args.status,
      publishedAt: getPublishedAt(args.status),
    },
  });
};
