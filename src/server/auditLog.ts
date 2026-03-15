/**
 * A4: Audit / Activity Log — fire-and-forget logging utility.
 *
 * Usage:
 *   logAudit({ userId, action: "extension.purchase", resource: "extension:seo-agent" });
 */
import { prisma } from "wasp/server";

interface AuditEntry {
  userId?: string | null;
  action: string;
  resource?: string | null;
  detail?: string | null;
  ip?: string | null;
}

/**
 * Log an audit event. Fire-and-forget — never throws, never blocks the caller.
 */
export function logAudit(entry: AuditEntry): void {
  prisma.auditLog
    .create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        resource: entry.resource ?? null,
        detail: entry.detail ?? null,
        ip: entry.ip ?? null,
      },
    })
    .catch((err) => {
      console.error("[auditLog] Failed to write audit entry:", err);
    });
}

/**
 * Clean up audit entries older than the given number of days.
 * Call from a PgBoss scheduled job.
 */
export async function pruneAuditLogs(daysToKeep = 90): Promise<number> {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return result.count;
}
