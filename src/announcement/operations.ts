import { HttpError } from "wasp/server";
import { z } from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation.js";
import type {
  GetActiveAnnouncements,
  GetAdminAnnouncements,
  CreateAnnouncement,
  UpdateAnnouncement,
  DeleteAnnouncement,
} from "wasp/server/operations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertAdmin(context: any) {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  if (!context.user.isAdmin) throw new HttpError(403, "Admin access required");
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  linkText: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  type: z.enum(["announcement", "promotion"]).optional(),
  bgFrom: z.string().optional().nullable(),
  bgTo: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  priority: z.number().int().optional(),
  dismissible: z.boolean().optional(),
  animation: z.enum(["none", "slideDown", "shimmer", "pulse", "gradientMove", "marquee"]).optional(),
});

const updateAnnouncementSchema = createAnnouncementSchema.extend({
  id: z.string().uuid(),
});

const idSchema = z.object({ id: z.string().uuid() });

// ---------------------------------------------------------------------------
// Public: Get active announcements (no auth required)
// ---------------------------------------------------------------------------

export const getActiveAnnouncements: GetActiveAnnouncements<void, any[]> = async (
  _args,
  context,
) => {
  const now = new Date();

  return context.entities.Announcement.findMany({
    where: {
      isActive: true,
      OR: [
        { startsAt: null },
        { startsAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endsAt: null },
            { endsAt: { gt: now } },
          ],
        },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 5,
  });
};

// ---------------------------------------------------------------------------
// Admin: List all announcements
// ---------------------------------------------------------------------------

export const getAdminAnnouncements: GetAdminAnnouncements<void, any[]> = async (
  _args,
  context,
) => {
  assertAdmin(context);

  return context.entities.Announcement.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
};

// ---------------------------------------------------------------------------
// Admin: Create
// ---------------------------------------------------------------------------

export const createAnnouncement: CreateAnnouncement<
  z.infer<typeof createAnnouncementSchema>,
  any
> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(createAnnouncementSchema, rawArgs);

  return context.entities.Announcement.create({
    data: {
      title: args.title,
      linkText: args.linkText ?? null,
      linkUrl: args.linkUrl ?? null,
      type: args.type ?? "announcement",
      bgFrom: args.bgFrom ?? null,
      bgTo: args.bgTo ?? null,
      isActive: args.isActive ?? true,
      startsAt: args.startsAt ? new Date(args.startsAt) : null,
      endsAt: args.endsAt ? new Date(args.endsAt) : null,
      priority: args.priority ?? 0,
      dismissible: args.dismissible ?? true,
      animation: args.animation ?? "none",
    },
  });
};

// ---------------------------------------------------------------------------
// Admin: Update
// ---------------------------------------------------------------------------

export const updateAnnouncement: UpdateAnnouncement<
  z.infer<typeof updateAnnouncementSchema>,
  any
> = async (rawArgs, context) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateAnnouncementSchema, rawArgs);

  const existing = await context.entities.Announcement.findUnique({
    where: { id: args.id },
  });
  if (!existing) throw new HttpError(404, "Announcement not found");

  return context.entities.Announcement.update({
    where: { id: args.id },
    data: {
      title: args.title,
      linkText: args.linkText ?? null,
      linkUrl: args.linkUrl ?? null,
      type: args.type ?? existing.type,
      bgFrom: args.bgFrom ?? null,
      bgTo: args.bgTo ?? null,
      isActive: args.isActive ?? existing.isActive,
      startsAt: args.startsAt ? new Date(args.startsAt) : null,
      endsAt: args.endsAt ? new Date(args.endsAt) : null,
      priority: args.priority ?? existing.priority,
      dismissible: args.dismissible ?? existing.dismissible,
      animation: args.animation ?? existing.animation,
    },
  });
};

// ---------------------------------------------------------------------------
// Admin: Delete
// ---------------------------------------------------------------------------

export const deleteAnnouncement: DeleteAnnouncement<{ id: string }, any> = async (
  rawArgs,
  context,
) => {
  assertAdmin(context);
  const args = ensureArgsSchemaOrThrowHttpError(idSchema, rawArgs);

  const existing = await context.entities.Announcement.findUnique({
    where: { id: args.id },
  });
  if (!existing) throw new HttpError(404, "Announcement not found");

  return context.entities.Announcement.delete({ where: { id: args.id } });
};
