import { LEVELS, POINTS_BY_ACTION } from "@/lib/constants";
import type { Level, PointEvent } from "@/lib/types";

export type PointAction = keyof typeof POINTS_BY_ACTION;

export function getPointsForAction(action: PointAction): number {
  return POINTS_BY_ACTION[action];
}

export function resolveLevel(xp: number): Level {
  return LEVELS.find((level) => xp >= level.minXp && (level.maxXp === null || xp <= level.maxXp)) ?? LEVELS[0];
}

export function getProgressToNextLevel(xp: number): { current: Level; next: Level | null; percent: number } {
  const current = resolveLevel(xp);
  const next = LEVELS.find((level) => level.minXp > current.minXp) ?? null;
  if (!next || current.maxXp === null) return { current, next, percent: 100 };

  const span = next.minXp - current.minXp;
  const progress = xp - current.minXp;
  return { current, next, percent: Math.max(0, Math.min(100, Math.round((progress / span) * 100))) };
}

export function appendPointEvent(existing: PointEvent[], next: PointEvent): PointEvent[] {
  if (next.idempotencyKey && existing.some((event) => event.idempotencyKey === next.idempotencyKey)) {
    return existing;
  }
  return [...existing, next];
}

export function sumPoints(events: PointEvent[], userId: string): number {
  return events.filter((event) => event.userId === userId).reduce((total, event) => total + event.points, 0);
}
