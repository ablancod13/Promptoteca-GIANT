import { describe, expect, it } from "vitest";
import { appendPointEvent, getProgressToNextLevel, resolveLevel, sumPoints } from "@/lib/gamification";
import type { PointEvent } from "@/lib/types";

describe("gamification", () => {
  it("resolves levels from accumulated XP", () => {
    expect(resolveLevel(0).name).toBe("Explorador/a GIANT");
    expect(resolveLevel(186).name).toBe("Contribuidor/a");
    expect(resolveLevel(12000).name).toBe("Embajador/a GIANT");
  });

  it("computes progress to next level", () => {
    const progress = getProgressToNextLevel(75);

    expect(progress.current.level).toBe(2);
    expect(progress.next?.level).toBe(3);
    expect(progress.percent).toBeGreaterThan(0);
  });

  it("keeps point events idempotent", () => {
    const event: PointEvent = {
      id: "e1",
      userId: "u1",
      action: "favorite_saved",
      points: 1,
      createdAt: "2026-06-01T00:00:00.000Z",
      idempotencyKey: "u1:favorite:p1"
    };

    const events = appendPointEvent(appendPointEvent([], event), { ...event, id: "e2" });

    expect(events).toHaveLength(1);
    expect(sumPoints(events, "u1")).toBe(1);
  });
});
