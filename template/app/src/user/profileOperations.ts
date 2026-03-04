import { HttpError } from "wasp/server";
import { type UpdateUserProfile } from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const updateUserProfileSchema = z.object({
  fullName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().max(5000000).optional(),
  company: z.string().max(100).optional(),
  username: z.string().min(2).max(50).optional(),
});

type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export const updateUserProfile: UpdateUserProfile<
  UpdateUserProfileInput,
  { success: boolean }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    updateUserProfileSchema,
    rawArgs,
  );

  // If username is being changed, check uniqueness
  if (args.username && args.username !== context.user.username) {
    const existing = await context.entities.User.findUnique({
      where: { username: args.username },
    });
    if (existing) {
      throw new HttpError(409, "Username is already taken");
    }
  }

  await context.entities.User.update({
    where: { id: context.user.id },
    data: {
      ...(args.fullName !== undefined && { fullName: args.fullName }),
      ...(args.phone !== undefined && { phone: args.phone }),
      ...(args.bio !== undefined && { bio: args.bio }),
      ...(args.avatarUrl !== undefined && {
        avatarUrl: args.avatarUrl || null,
      }),
      ...(args.company !== undefined && { company: args.company }),
      ...(args.username !== undefined && { username: args.username }),
    },
  });

  return { success: true };
};
