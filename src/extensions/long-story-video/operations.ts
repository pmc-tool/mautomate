import { HttpError } from "wasp/server";

const EXTENSION_ID = "long-story-video";

// ---------------------------------------------------------------------------
// Extension guard
// ---------------------------------------------------------------------------

async function ensureExtensionActive(
  userExtensionEntity: any,
  userId: string
) {
  const ue = await userExtensionEntity.findUnique({
    where: { userId_extensionId: { userId, extensionId: EXTENSION_ID } },
  });
  if (!ue || !ue.isActive) {
    throw new HttpError(403, "Long Story Video extension is not active.");
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getStoryProjects = async (_args: any, context: any) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  return context.entities.StoryProject.findMany({
    where: { userId: context.user.id },
    include: { scenes: { orderBy: { sceneIndex: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
};

export const getStoryProject = async (
  args: { id: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await context.entities.StoryProject.findUnique({
    where: { id: args.id },
    include: { scenes: { orderBy: { sceneIndex: "asc" } } },
  });

  if (!project || project.userId !== context.user.id) {
    throw new HttpError(404, "Story project not found.");
  }

  return project;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const createStoryProject = async (
  args: { prompt: string; targetDuration: number; referenceImageUrl?: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  if (!args.prompt || args.prompt.trim().length < 20) {
    throw new HttpError(400, "Prompt must be at least 20 characters.");
  }

  if (![20, 60, 120].includes(args.targetDuration)) {
    throw new HttpError(400, "Target duration must be 20, 60, or 120 seconds.");
  }

  return context.entities.StoryProject.create({
    data: {
      userId: context.user.id,
      title: args.prompt.slice(0, 80),
      prompt: args.prompt.trim(),
      targetDuration: args.targetDuration,
      referenceImageUrl: args.referenceImageUrl || null,
      status: "draft",
    },
  });
};

export const deleteStoryProject = async (
  args: { id: string },
  context: any
) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const project = await context.entities.StoryProject.findUnique({
    where: { id: args.id },
    include: { scenes: true },
  });

  if (!project || project.userId !== context.user.id) {
    throw new HttpError(404, "Story project not found.");
  }

  // Prevent deletion while scenes are actively generating
  const hasGeneratingScenes = project.scenes?.some((s: any) => s.status === "generating");
  if (hasGeneratingScenes) {
    throw new HttpError(409, "Cannot delete a project while scenes are being generated. Wait for generation to complete or fail.");
  }

  // Cascade delete handles scenes
  await context.entities.StoryProject.delete({ where: { id: args.id } });
};
