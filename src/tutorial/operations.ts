import { HttpError } from "wasp/server";
import type {
  GetPublishedTutorials,
  GetAdminTutorials,
  CreateTutorial,
  UpdateTutorial,
  DeleteTutorial,
  SetTutorialStatus,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const TUTORIAL_STATUSES = ["draft", "published"] as const;

const searchSchema = z
  .object({
    search: z.string().optional(),
    status: z.enum(TUTORIAL_STATUSES).optional(),
  })
  .optional();

const idSchema = z.object({ id: z.string().uuid() });

const tutorialInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  embedCode: z.string().min(1, "Embed code is required"),
  status: z.enum(TUTORIAL_STATUSES).optional(),
  sortOrder: z.number().int().optional(),
});

const updateTutorialSchema = tutorialInputSchema.extend({
  id: z.string().uuid(),
});

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(TUTORIAL_STATUSES),
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

// ─── User queries ───────────────────────────────────────────────────────────

export const getPublishedTutorials: GetPublishedTutorials<void, any[]> = async (
  _args,
  context,
) => {
  return context.entities.Tutorial.findMany({
    where: { status: "published" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      embedCode: true,
      publishedAt: true,
      createdAt: true,
    },
  });
};

// ─── Admin queries ──────────────────────────────────────────────────────────

export const getAdminTutorials: GetAdminTutorials<any, any[]> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);

  const args = ensureArgsSchemaOrThrowHttpError(searchSchema, rawArgs);

  return context.entities.Tutorial.findMany({
    where: {
      ...(args?.search
        ? {
            title: { contains: args.search, mode: "insensitive" },
          }
        : {}),
      ...(args?.status ? { status: args.status } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      embedCode: true,
      status: true,
      sortOrder: true,
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

// ─── Admin actions ──────────────────────────────────────────────────────────

export const createTutorial: CreateTutorial<
  z.infer<typeof tutorialInputSchema>,
  any
> = async (rawArgs, context) => {
  assertAdmin(context);
  const currentUser = context.user!;
  const args = ensureArgsSchemaOrThrowHttpError(tutorialInputSchema, rawArgs);

  const status = args.status ?? "draft";

  return context.entities.Tutorial.create({
    data: {
      authorId: currentUser.id,
      title: args.title,
      embedCode: args.embedCode,
      status,
      sortOrder: args.sortOrder ?? 0,
      publishedAt: status === "published" ? new Date() : null,
    },
  });
};

export const updateTutorial: UpdateTutorial<
  z.infer<typeof updateTutorialSchema>,
  any
> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateTutorialSchema, rawArgs);

  const existing = await context.entities.Tutorial.findUnique({
    where: { id: args.id },
  });
  if (!existing) {
    throw new HttpError(404, "Tutorial not found");
  }

  const status = args.status ?? existing.status;

  return context.entities.Tutorial.update({
    where: { id: args.id },
    data: {
      title: args.title,
      embedCode: args.embedCode,
      status,
      sortOrder: args.sortOrder ?? existing.sortOrder,
      publishedAt:
        status === "published" && !existing.publishedAt
          ? new Date()
          : existing.publishedAt,
    },
  });
};

export const deleteTutorial: DeleteTutorial<{ id: string }, void> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);

  const existing = await context.entities.Tutorial.findUnique({
    where: { id: args.id },
  });
  if (!existing) {
    throw new HttpError(404, "Tutorial not found");
  }

  await context.entities.Tutorial.delete({ where: { id: args.id } });
};

export const setTutorialStatus: SetTutorialStatus<
  z.infer<typeof setStatusSchema>,
  any
> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(setStatusSchema, rawArgs);

  const existing = await context.entities.Tutorial.findUnique({
    where: { id: args.id },
  });
  if (!existing) {
    throw new HttpError(404, "Tutorial not found");
  }

  return context.entities.Tutorial.update({
    where: { id: args.id },
    data: {
      status: args.status,
      publishedAt:
        args.status === "published" && !existing.publishedAt
          ? new Date()
          : existing.publishedAt,
    },
  });
};
