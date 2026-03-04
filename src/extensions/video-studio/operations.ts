// ---------------------------------------------------------------------------
// Video Studio — Project CRUD + Generation Queries
// ---------------------------------------------------------------------------

import { HttpError } from "wasp/server";
import type {
  GetVideoProjects,
  GetVideoProject,
  GetVideoGenerations,
  GetVideoGeneration,
  CreateVideoProject,
  UpdateVideoProject,
  DeleteVideoProject,
} from "wasp/server/operations";

const EXTENSION_ID = "video-studio";

// ---------------------------------------------------------------------------
// Guard: ensure extension is active for user
// ---------------------------------------------------------------------------

async function ensureExtensionActive(
  userExtensionEntity: any,
  userId: string,
) {
  const ue = await userExtensionEntity.findUnique({
    where: { userId_extensionId: { userId, extensionId: EXTENSION_ID } },
  });
  if (!ue || !ue.isActive) {
    throw new HttpError(403, "Video Studio extension is not active.");
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getVideoProjects: GetVideoProjects<
  { search?: string },
  any[]
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  return context.entities.VideoProject.findMany({
    where: {
      userId: context.user.id,
      ...(args?.search
        ? { name: { contains: args.search, mode: "insensitive" } }
        : {}),
    },
    include: {
      _count: { select: { generations: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
};

export const getVideoProject: GetVideoProject<
  { id: string },
  any
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await context.entities.VideoProject.findUnique({
    where: { id: args.id },
    include: {
      generations: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project || project.userId !== context.user.id) {
    throw new HttpError(404, "Project not found");
  }

  return project;
};

export const getVideoGenerations: GetVideoGenerations<
  {
    type?: string;
    status?: string;
    model?: string;
    projectId?: string;
    page?: number;
    pageSize?: number;
  },
  { generations: any[]; total: number }
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const page = args?.page ?? 1;
  const pageSize = args?.pageSize ?? 20;

  const where: any = { userId: context.user.id };
  if (args?.type) where.type = args.type;
  if (args?.status) where.status = args.status;
  if (args?.model) where.model = args.model;
  if (args?.projectId) where.projectId = args.projectId;

  const [generations, total] = await Promise.all([
    context.entities.VideoGeneration.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    context.entities.VideoGeneration.count({ where }),
  ]);

  return { generations, total };
};

export const getVideoGeneration: GetVideoGeneration<
  { id: string },
  any
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const gen = await context.entities.VideoGeneration.findUnique({
    where: { id: args.id },
    include: { project: { select: { id: true, name: true } } },
  });

  if (!gen || gen.userId !== context.user.id) {
    throw new HttpError(404, "Generation not found");
  }

  return gen;
};

// ---------------------------------------------------------------------------
// Actions: Project CRUD
// ---------------------------------------------------------------------------

export const createVideoProject: CreateVideoProject<
  { name: string; description?: string; category?: string },
  any
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  if (!args.name?.trim()) {
    throw new HttpError(400, "Project name is required");
  }

  return context.entities.VideoProject.create({
    data: {
      userId: context.user.id,
      name: args.name.trim(),
      description: args.description?.trim() || null,
      category: args.category || "custom",
    },
  });
};

export const updateVideoProject: UpdateVideoProject<
  { id: string; name?: string; description?: string; category?: string },
  any
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await context.entities.VideoProject.findUnique({
    where: { id: args.id },
  });
  if (!project || project.userId !== context.user.id) {
    throw new HttpError(404, "Project not found");
  }

  const data: any = {};
  if (args.name !== undefined) data.name = args.name.trim();
  if (args.description !== undefined) data.description = args.description?.trim() || null;
  if (args.category !== undefined) data.category = args.category;

  return context.entities.VideoProject.update({
    where: { id: args.id },
    data,
  });
};

export const deleteVideoProject: DeleteVideoProject<
  { id: string },
  void
> = async (args, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await context.entities.VideoProject.findUnique({
    where: { id: args.id },
  });
  if (!project || project.userId !== context.user.id) {
    throw new HttpError(404, "Project not found");
  }

  await context.entities.VideoProject.delete({ where: { id: args.id } });
};
