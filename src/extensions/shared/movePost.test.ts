import { describe, it, expect, vi, beforeEach } from "vitest";
import * as z from "zod";

// ---------------------------------------------------------------------------
// Test the movePost Zod schema and business logic independently
// (Without full Wasp runtime — we test the schema + logic extraction)
// ---------------------------------------------------------------------------

// Replicate the schema exactly as in approvalOperations.ts
const postTypeEnum = z.enum(["social", "seo"]);

const movePostSchema = z.object({
  postType: postTypeEnum,
  postId: z.string().uuid(),
  targetStatus: z.enum(["draft", "approved", "scheduled", "published"]),
  scheduledAt: z.string().optional(),
});

// Replicate the scheduling logic from movePost handler
function computeScheduleUpdate(
  targetStatus: string,
  existingScheduledAt: Date | null,
  providedScheduledAt?: string
): { scheduledAt?: Date | null; approvedAt?: Date } {
  const updateData: any = {};

  if (targetStatus === "approved") {
    updateData.approvedAt = new Date();
  }

  if (targetStatus === "draft" || targetStatus === "approved") {
    updateData.scheduledAt = null;
  }

  if (targetStatus === "scheduled") {
    if (providedScheduledAt) {
      updateData.scheduledAt = new Date(providedScheduledAt);
    } else if (!existingScheduledAt) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      updateData.scheduledAt = tomorrow;
    }
  }

  return updateData;
}

describe("movePost schema validation", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid move to draft", () => {
    const result = movePostSchema.safeParse({
      postType: "social",
      postId: validUUID,
      targetStatus: "draft",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid move to scheduled with scheduledAt", () => {
    const result = movePostSchema.safeParse({
      postType: "seo",
      postId: validUUID,
      targetStatus: "scheduled",
      scheduledAt: "2026-03-15T14:00:00.000Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledAt).toBe("2026-03-15T14:00:00.000Z");
    }
  });

  it("accepts move to scheduled without scheduledAt (optional)", () => {
    const result = movePostSchema.safeParse({
      postType: "social",
      postId: validUUID,
      targetStatus: "scheduled",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledAt).toBeUndefined();
    }
  });

  it("rejects invalid postType", () => {
    const result = movePostSchema.safeParse({
      postType: "email",
      postId: validUUID,
      targetStatus: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid targetStatus", () => {
    const result = movePostSchema.safeParse({
      postType: "social",
      postId: validUUID,
      targetStatus: "archived",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID", () => {
    const result = movePostSchema.safeParse({
      postType: "social",
      postId: "not-a-uuid",
      targetStatus: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = movePostSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("movePost scheduling logic", () => {
  it("uses provided scheduledAt when moving to scheduled", () => {
    const update = computeScheduleUpdate(
      "scheduled",
      null,
      "2026-03-20T15:00:00.000Z"
    );

    expect(update.scheduledAt).toEqual(new Date("2026-03-20T15:00:00.000Z"));
  });

  it("defaults to tomorrow 9 AM when no scheduledAt provided and none exists", () => {
    const update = computeScheduleUpdate("scheduled", null);

    expect(update.scheduledAt).toBeInstanceOf(Date);
    const scheduled = update.scheduledAt as Date;
    expect(scheduled.getHours()).toBe(9);
    expect(scheduled.getMinutes()).toBe(0);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(scheduled.getDate()).toBe(tomorrow.getDate());
  });

  it("keeps existing scheduledAt when no new one provided", () => {
    const existing = new Date("2026-04-01T10:00:00.000Z");
    const update = computeScheduleUpdate("scheduled", existing);

    // Should NOT set a new scheduledAt (existing one is kept)
    expect(update.scheduledAt).toBeUndefined();
  });

  it("overrides existing scheduledAt when new one provided", () => {
    const existing = new Date("2026-04-01T10:00:00.000Z");
    const update = computeScheduleUpdate(
      "scheduled",
      existing,
      "2026-05-01T12:00:00.000Z"
    );

    expect(update.scheduledAt).toEqual(new Date("2026-05-01T12:00:00.000Z"));
  });

  it("clears scheduledAt when moving to draft", () => {
    const update = computeScheduleUpdate("draft", new Date());

    expect(update.scheduledAt).toBeNull();
  });

  it("clears scheduledAt when moving to approved", () => {
    const update = computeScheduleUpdate("approved", new Date());

    expect(update.scheduledAt).toBeNull();
    expect(update.approvedAt).toBeInstanceOf(Date);
  });

  it("does not set scheduledAt when moving to published", () => {
    const update = computeScheduleUpdate("published", null);

    expect(update.scheduledAt).toBeUndefined();
  });
});
