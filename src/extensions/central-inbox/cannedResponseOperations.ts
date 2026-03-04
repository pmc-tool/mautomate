import { HttpError } from "wasp/server";
import type {
  GetCannedResponses,
  SaveCannedResponse,
  DeleteCannedResponse,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";

// ---------------------------------------------------------------------------
// Extension guard
// ---------------------------------------------------------------------------

const EXTENSION_ID = "central-inbox";

async function ensureExtensionActive(
  userExtensionEntity: any,
  userId: string
): Promise<void> {
  const record = await userExtensionEntity.findUnique({
    where: { userId_extensionId: { userId, extensionId: EXTENSION_ID } },
  });
  if (!record?.isActive) {
    throw new HttpError(
      403,
      "Central Inbox extension is not activated. Enable it in the Marketplace."
    );
  }
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const getCannedResponsesSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
}).optional();

const saveCannedResponseSchema = z.object({
  id: z.string().uuid().optional(), // if provided, update
  shortcut: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.string().optional().nullable(),
});

const deleteCannedResponseSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export const getCannedResponses: GetCannedResponses<
  z.infer<typeof getCannedResponsesSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = rawArgs ?? {};

  const where: any = { userId: context.user.id };

  if (args.category) where.category = args.category;
  if (args.search) {
    where.OR = [
      { shortcut: { contains: args.search, mode: "insensitive" } },
      { title: { contains: args.search, mode: "insensitive" } },
      { content: { contains: args.search, mode: "insensitive" } },
    ];
  }

  return context.entities.InboxCannedResponse.findMany({
    where,
    orderBy: { shortcut: "asc" },
  });
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const saveCannedResponse: SaveCannedResponse<
  z.infer<typeof saveCannedResponseSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(saveCannedResponseSchema, rawArgs);

  if (args.id) {
    // Update
    const existing = await context.entities.InboxCannedResponse.findUnique({
      where: { id: args.id },
      select: { userId: true },
    });
    if (!existing) throw new HttpError(404, "Canned response not found");
    if (existing.userId !== context.user.id) throw new HttpError(403, "Not authorized");

    return context.entities.InboxCannedResponse.update({
      where: { id: args.id },
      data: {
        shortcut: args.shortcut,
        title: args.title,
        content: args.content,
        category: args.category,
      },
    });
  }

  // Create
  return context.entities.InboxCannedResponse.create({
    data: {
      userId: context.user.id,
      shortcut: args.shortcut,
      title: args.title,
      content: args.content,
      category: args.category,
    },
  });
};

export const deleteCannedResponse: DeleteCannedResponse<
  z.infer<typeof deleteCannedResponseSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(deleteCannedResponseSchema, rawArgs);

  const existing = await context.entities.InboxCannedResponse.findUnique({
    where: { id: args.id },
    select: { userId: true },
  });
  if (!existing) throw new HttpError(404, "Canned response not found");
  if (existing.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  await context.entities.InboxCannedResponse.delete({ where: { id: args.id } });

  return { success: true };
};
