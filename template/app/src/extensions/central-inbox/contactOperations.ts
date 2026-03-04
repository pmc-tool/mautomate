import { HttpError } from "wasp/server";
import type {
  GetInboxContacts,
  UpdateInboxContact,
  AddContactTag,
  RemoveContactTag,
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

const getContactsSchema = z.object({
  search: z.string().optional(),
  channel: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const updateContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  customFields: z.record(z.any()).optional(),
});

const addTagSchema = z.object({
  contactId: z.string().uuid(),
  tag: z.string().min(1).max(50),
});

const removeTagSchema = z.object({
  contactId: z.string().uuid(),
  tag: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getInboxContacts: GetInboxContacts<
  z.infer<typeof getContactsSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(getContactsSchema, rawArgs);

  const where: any = { userId: context.user.id };

  if (args.channel) where.channel = args.channel;

  if (args.search) {
    where.OR = [
      { name: { contains: args.search, mode: "insensitive" } },
      { email: { contains: args.search, mode: "insensitive" } },
      { phone: { contains: args.search, mode: "insensitive" } },
    ];
  }

  const contacts = await context.entities.InboxContact.findMany({
    where,
    include: {
      conversations: {
        select: { id: true, status: true, channel: true, lastMessageAt: true },
        orderBy: { lastMessageAt: "desc" },
        take: 5,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: args.limit || 50,
    ...(args.cursor ? { skip: 1, cursor: { id: args.cursor } } : {}),
  });

  const limit = args.limit || 50;
  return {
    contacts,
    nextCursor: contacts.length === limit ? contacts[contacts.length - 1]?.id : null,
  };
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const updateInboxContact: UpdateInboxContact<
  z.infer<typeof updateContactSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(updateContactSchema, rawArgs);

  const contact = await context.entities.InboxContact.findUnique({
    where: { id: args.id },
    select: { userId: true },
  });
  if (!contact) throw new HttpError(404, "Contact not found");
  if (contact.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  const { id, customFields, ...updateData } = args;

  const updated = await context.entities.InboxContact.update({
    where: { id },
    data: {
      ...updateData,
      ...(customFields ? { customFields: customFields as any } : {}),
    },
  });

  return updated;
};

export const addContactTag: AddContactTag<
  z.infer<typeof addTagSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(addTagSchema, rawArgs);

  const contact = await context.entities.InboxContact.findUnique({
    where: { id: args.contactId },
  });
  if (!contact) throw new HttpError(404, "Contact not found");
  if (contact.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  const tags = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];
  if (tags.includes(args.tag)) return contact; // already has tag

  const updated = await context.entities.InboxContact.update({
    where: { id: args.contactId },
    data: { tags: [...tags, args.tag] as any },
  });

  return updated;
};

export const removeContactTag: RemoveContactTag<
  z.infer<typeof removeTagSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  await ensureExtensionActive(context.entities.UserExtension, context.user.id);

  const args = ensureArgsSchemaOrThrowHttpError(removeTagSchema, rawArgs);

  const contact = await context.entities.InboxContact.findUnique({
    where: { id: args.contactId },
  });
  if (!contact) throw new HttpError(404, "Contact not found");
  if (contact.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  const tags = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];

  const updated = await context.entities.InboxContact.update({
    where: { id: args.contactId },
    data: { tags: tags.filter((t) => t !== args.tag) as any },
  });

  return updated;
};
