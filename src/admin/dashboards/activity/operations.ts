import { HttpError } from "wasp/server";
import type { GetAuditLogs } from "wasp/server/operations";
import * as z from "zod";

const inputSchema = z
  .object({
    action: z.string().optional(),
    userId: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.number().min(1).max(100).default(50),
  })
  .optional();

type Input = z.infer<typeof inputSchema>;

export const getAuditLogs: GetAuditLogs<Input, any> = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401);
  if (!context.user.isAdmin) throw new HttpError(403, "Admin access required");

  const parsed = inputSchema.parse(rawArgs);
  const action = parsed?.action;
  const userId = parsed?.userId;
  const cursor = parsed?.cursor;
  const limit = parsed?.limit ?? 50;

  const where: any = {};
  if (action) where.action = { startsWith: action };
  if (userId) where.userId = userId;

  const logs = await context.entities.AuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;

  // Resolve user emails for display
  const userIds = [...new Set(items.map((l: any) => l.userId).filter(Boolean))];
  const users = userIds.length > 0
    ? await context.entities.User.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      })
    : [];
  const userMap = Object.fromEntries(users.map((u: any) => [u.id, u.email]));

  return {
    items: items.map((l: any) => ({
      ...l,
      userEmail: l.userId ? userMap[l.userId] ?? null : null,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
};
