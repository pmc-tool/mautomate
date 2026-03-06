import { HttpError } from "wasp/server";
import type {
  GetPublishedDocCategories,
  GetDocPagesByCategory,
  GetDocPageBySlug,
  GetAdminDocPages,
  GetAdminDocPageById,
  GetAdminDocCategories,
  CreateDocPage,
  UpdateDocPage,
  DeleteDocPage,
  CreateDocCategory,
  UpdateDocCategory,
  DeleteDocCategory,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const DOC_STATUSES = ["draft", "published", "archived"] as const;

const idSchema = z.object({ id: z.string().uuid() });

const listAdminPagesSchema = z
  .object({
    search: z.string().optional(),
    status: z.enum(DOC_STATUSES).optional(),
    categoryId: z.string().uuid().optional(),
  })
  .optional();

const docPageInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  categoryId: z.string().uuid("Category is required"),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1, "Content is required"),
  videoUrl: z.string().optional().nullable(),
  order: z.number().int().optional(),
  status: z.enum(DOC_STATUSES).optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});

const updateDocPageSchema = docPageInputSchema.extend({ id: z.string().uuid() });

const docCategoryInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  order: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

const updateDocCategorySchema = docCategoryInputSchema.extend({ id: z.string().uuid() });

function assertAdmin(context: any) {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  if (!context.user.isAdmin) throw new HttpError(403, "Admin access required");
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

async function generateUniqueDocPageSlug(entities: any, title: string, provided?: string, excludeId?: string) {
  const base = slugify(provided || title) || "page";
  let candidate = base;
  let i = 1;
  while (true) {
    const existing = await entities.DocPage.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${i++}`;
  }
}

async function generateUniqueDocCategorySlug(entities: any, name: string, provided?: string, excludeId?: string) {
  const base = slugify(provided || name) || "category";
  let candidate = base;
  let i = 1;
  while (true) {
    const existing = await entities.DocCategory.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${i++}`;
  }
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

// ─── Public Queries ───────────────────────────────────────────────────────────

export const getPublishedDocCategories: GetPublishedDocCategories<void, any[]> = async (_args, context) => {
  return context.entities.DocCategory.findMany({
    where: { isPublished: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      pages: {
        where: { status: "published", publishedAt: { lte: new Date() } },
        select: { id: true, title: true, slug: true, excerpt: true, order: true },
        orderBy: [{ order: "asc" }, { title: "asc" }],
      },
    },
  });
};

export const getDocPagesByCategory: GetDocPagesByCategory<{ categorySlug: string }, any> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(z.object({ categorySlug: z.string().min(1) }), rawArgs);

  const category = await context.entities.DocCategory.findUnique({
    where: { slug: args.categorySlug },
    include: {
      pages: {
        where: { status: "published", publishedAt: { lte: new Date() } },
        orderBy: [{ order: "asc" }, { title: "asc" }],
        select: { id: true, title: true, slug: true, excerpt: true, order: true, publishedAt: true },
      },
    },
  });

  if (!category || !category.isPublished) throw new HttpError(404, "Category not found");

  return category;
};

export const getDocPageBySlug: GetDocPageBySlug<{ categorySlug: string; pageSlug: string }, any> = async (rawArgs, context) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    z.object({ categorySlug: z.string().min(1), pageSlug: z.string().min(1) }),
    rawArgs,
  );

  const page = await context.entities.DocPage.findFirst({
    where: {
      slug: args.pageSlug,
      status: "published",
      publishedAt: { lte: new Date() },
      category: { slug: args.categorySlug, isPublished: true },
    },
    include: {
      category: {
        include: {
          pages: {
            where: { status: "published", publishedAt: { lte: new Date() } },
            orderBy: [{ order: "asc" }, { title: "asc" }],
            select: { id: true, title: true, slug: true, order: true },
          },
        },
      },
      author: { select: { id: true, username: true, email: true } },
    },
  });

  if (!page) throw new HttpError(404, "Page not found");

  return page;
};

// ─── Admin Queries ────────────────────────────────────────────────────────────

export const getAdminDocPages: GetAdminDocPages<any, any[]> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(listAdminPagesSchema, rawArgs);

  return context.entities.DocPage.findMany({
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
      ...(args?.categoryId ? { categoryId: args.categoryId } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, username: true, email: true } },
    },
  });
};

export const getAdminDocPageById: GetAdminDocPageById<{ id: string }, any> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);

  const page = await context.entities.DocPage.findUnique({
    where: { id: args.id },
    include: { category: true },
  });

  if (!page) throw new HttpError(404, "Page not found");
  return page;
};

export const getAdminDocCategories: GetAdminDocCategories<void, any[]> = async (_args, context) => {
  assertAdmin(context);

  return context.entities.DocCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { pages: true } } },
  });
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export const createDocPage: CreateDocPage<z.infer<typeof docPageInputSchema>, any> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(docPageInputSchema, rawArgs);

  const slug = await generateUniqueDocPageSlug(context.entities, args.title, args.slug);
  const status = args.status ?? "draft";
  const publishedAt = status === "published" ? new Date() : null;

  return context.entities.DocPage.create({
    data: {
      authorId: context.user!.id,
      categoryId: args.categoryId,
      title: args.title,
      slug,
      excerpt: args.excerpt ?? null,
      content: args.content,
      videoUrl: args.videoUrl ?? null,
      order: args.order ?? 0,
      status,
      publishedAt,
      seoTitle: args.seoTitle ?? null,
      seoDescription: args.seoDescription ?? null,
    },
  });
};

export const updateDocPage: UpdateDocPage<z.infer<typeof updateDocPageSchema>, any> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateDocPageSchema, rawArgs);

  const existing = await context.entities.DocPage.findUnique({ where: { id: args.id } });
  if (!existing) throw new HttpError(404, "Page not found");

  const slug = await generateUniqueDocPageSlug(context.entities, args.title, args.slug, args.id);
  const status = args.status ?? existing.status;
  const publishedAt =
    status === "published" ? (existing.publishedAt ?? new Date()) : existing.publishedAt;

  return context.entities.DocPage.update({
    where: { id: args.id },
    data: {
      categoryId: args.categoryId,
      title: args.title,
      slug,
      excerpt: args.excerpt ?? null,
      content: args.content,
      videoUrl: args.videoUrl ?? null,
      order: args.order ?? existing.order,
      status,
      publishedAt,
      seoTitle: args.seoTitle ?? null,
      seoDescription: args.seoDescription ?? null,
    },
  });
};

export const deleteDocPage: DeleteDocPage<{ id: string }, void> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);
  const existing = await context.entities.DocPage.findUnique({ where: { id: args.id } });
  if (!existing) throw new HttpError(404, "Page not found");
  await context.entities.DocPage.delete({ where: { id: args.id } });
};

export const createDocCategory: CreateDocCategory<z.infer<typeof docCategoryInputSchema>, any> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(docCategoryInputSchema, rawArgs);

  const slug = await generateUniqueDocCategorySlug(context.entities, args.name, args.slug);

  return context.entities.DocCategory.create({
    data: {
      name: args.name,
      slug,
      description: args.description ?? null,
      icon: args.icon ?? null,
      order: args.order ?? 0,
      isPublished: args.isPublished ?? false,
    },
  });
};

export const updateDocCategory: UpdateDocCategory<z.infer<typeof updateDocCategorySchema>, any> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateDocCategorySchema, rawArgs);

  const existing = await context.entities.DocCategory.findUnique({ where: { id: args.id } });
  if (!existing) throw new HttpError(404, "Category not found");

  const slug = await generateUniqueDocCategorySlug(context.entities, args.name, args.slug, args.id);

  return context.entities.DocCategory.update({
    where: { id: args.id },
    data: {
      name: args.name,
      slug,
      description: args.description ?? null,
      icon: args.icon ?? null,
      order: args.order ?? existing.order,
      isPublished: args.isPublished ?? existing.isPublished,
    },
  });
};

export const deleteDocCategory: DeleteDocCategory<{ id: string }, void> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);

  const existing = await context.entities.DocCategory.findUnique({
    where: { id: args.id },
    include: { _count: { select: { pages: true } } },
  });
  if (!existing) throw new HttpError(404, "Category not found");
  if ((existing as any)._count.pages > 0) {
    throw new HttpError(400, "Cannot delete a category that still has pages. Move or delete the pages first.");
  }

  await context.entities.DocCategory.delete({ where: { id: args.id } });
};
