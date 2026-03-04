import { HttpError } from "wasp/server";
import type {
  GetPublishedBlogPosts,
  GetPublishedBlogPostBySlug,
  GetAdminBlogPosts,
  GetAdminBlogPostById,
  CreateBlogPost,
  UpdateBlogPost,
  DeleteBlogPost,
  SetBlogPostStatus,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const BLOG_POST_STATUSES = ["draft", "scheduled", "published", "archived"] as const;

const listAdminBlogPostsSchema = z
  .object({
    search: z.string().optional(),
    status: z.enum(BLOG_POST_STATUSES).optional(),
  })
  .optional();

const idSchema = z.object({ id: z.string().uuid() });

const slugSchema = z.object({ slug: z.string().min(1) });

const blogPostInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1).optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1, "Content is required"),
  coverImageUrl: z.string().url().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  status: z.enum(BLOG_POST_STATUSES).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
});

const updateBlogPostSchema = blogPostInputSchema.extend({
  id: z.string().uuid(),
});

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(BLOG_POST_STATUSES),
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
  const baseSlug = slugify(providedSlug || title) || "post";

  let candidate = baseSlug;
  let i = 1;

  while (true) {
    const existing = await entities.BlogPost.findUnique({ where: { slug: candidate } });
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

export const getPublishedBlogPosts: GetPublishedBlogPosts<void, any[]> = async (_args, context) => {
  return context.entities.BlogPost.findMany({
    where: {
      status: "published",
      publishedAt: { lte: new Date() },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
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

export const getPublishedBlogPostBySlug: GetPublishedBlogPostBySlug<{ slug: string }, any> = async (
  rawArgs,
  context,
) => {
  const args = ensureArgsSchemaOrThrowHttpError(slugSchema, rawArgs);

  const post = await context.entities.BlogPost.findFirst({
    where: {
      slug: args.slug,
      status: "published",
      publishedAt: { lte: new Date() },
    },
    select: {
      id: true,
      title: true,
      slug: true,
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

  if (!post) {
    throw new HttpError(404, "Blog post not found");
  }

  return post;
};

export const getAdminBlogPosts: GetAdminBlogPosts<any, any[]> = async (rawArgs, context) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(listAdminBlogPostsSchema, rawArgs);

  return context.entities.BlogPost.findMany({
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
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
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

export const getAdminBlogPostById: GetAdminBlogPostById<{ id: string }, any> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);

  const post = await context.entities.BlogPost.findUnique({
    where: { id: args.id },
  });

  if (!post) {
    throw new HttpError(404, "Blog post not found");
  }

  return post;
};

export const createBlogPost: CreateBlogPost<z.infer<typeof blogPostInputSchema>, any> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);
  const currentUser = context.user!;

  const args = ensureArgsSchemaOrThrowHttpError(blogPostInputSchema, rawArgs);

  const slug = await generateUniqueSlug(context.entities, args.title, args.slug);
  const status = args.status ?? "draft";

  return context.entities.BlogPost.create({
    data: {
      authorId: currentUser.id,
      title: args.title,
      slug,
      excerpt: args.excerpt ?? null,
      content: args.content,
      coverImageUrl: args.coverImageUrl ?? null,
      status,
      publishedAt: getPublishedAt(status, args.publishedAt ?? null),
      seoTitle: args.seoTitle ?? null,
      seoDescription: args.seoDescription ?? null,
    },
  });
};

export const updateBlogPost: UpdateBlogPost<z.infer<typeof updateBlogPostSchema>, any> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(updateBlogPostSchema, rawArgs);

  const existing = await context.entities.BlogPost.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, "Blog post not found");
  }

  const slug = await generateUniqueSlug(context.entities, args.title, args.slug, args.id);
  const status = args.status ?? existing.status;

  return context.entities.BlogPost.update({
    where: { id: args.id },
    data: {
      title: args.title,
      slug,
      excerpt: args.excerpt ?? null,
      content: args.content,
      coverImageUrl: args.coverImageUrl ?? null,
      status,
      publishedAt: getPublishedAt(status, args.publishedAt ?? null),
      seoTitle: args.seoTitle ?? null,
      seoDescription: args.seoDescription ?? null,
    },
  });
};

export const deleteBlogPost: DeleteBlogPost<{ id: string }, void> = async (rawArgs, context) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);

  const existing = await context.entities.BlogPost.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, "Blog post not found");
  }

  await context.entities.BlogPost.delete({ where: { id: args.id } });
};

export const setBlogPostStatus: SetBlogPostStatus<z.infer<typeof setStatusSchema>, any> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(setStatusSchema, rawArgs);

  const existing = await context.entities.BlogPost.findUnique({ where: { id: args.id } });
  if (!existing) {
    throw new HttpError(404, "Blog post not found");
  }

  return context.entities.BlogPost.update({
    where: { id: args.id },
    data: {
      status: args.status,
      publishedAt: getPublishedAt(args.status),
    },
  });
};
