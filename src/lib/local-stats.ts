"use client";

import type { Prompt } from "@/lib/types";

export interface LocalPromptStats {
  likes: number;
  favorites: number;
  copies: number;
  templateUses: number;
}

type ManualStats = Record<string, Partial<LocalPromptStats>>;
type CountMap = Record<string, number>;

const MANUAL_STATS_KEY = "giant_manual_stats";
const LOCAL_COPIES_KEY = "giant_prompt_copies";
const LIKES_KEY = "giant_likes";
const FAVORITES_KEY = "giant_favorites";

export function getLocalPromptStats(prompt: Prompt): LocalPromptStats {
  const base = {
    likes: prompt.likes,
    favorites: prompt.favorites,
    copies: prompt.copies,
    templateUses: prompt.templateUses
  };

  if (typeof window === "undefined") return base;

  const manual = readJson<ManualStats>(MANUAL_STATS_KEY, {});
  const copies = readJson<CountMap>(LOCAL_COPIES_KEY, {});
  const likedIds = new Set(readJson<string[]>(LIKES_KEY, []));
  const favoriteIds = new Set(readJson<string[]>(FAVORITES_KEY, []));
  const overrides = manual[prompt.id] ?? {};

  return {
    likes: overrides.likes ?? base.likes + (likedIds.has(prompt.id) ? 1 : 0),
    favorites: overrides.favorites ?? base.favorites + (favoriteIds.has(prompt.id) ? 1 : 0),
    copies: overrides.copies ?? base.copies + (copies[prompt.id] ?? 0),
    templateUses: overrides.templateUses ?? base.templateUses
  };
}

export function incrementLocalCopy(promptId: string) {
  const copies = readJson<CountMap>(LOCAL_COPIES_KEY, {});
  copies[promptId] = (copies[promptId] ?? 0) + 1;
  window.localStorage.setItem(LOCAL_COPIES_KEY, JSON.stringify(copies));
  notifyStatsUpdated();
}

export function updateManualPromptStat(promptId: string, field: keyof LocalPromptStats, value: number) {
  const manual = readJson<ManualStats>(MANUAL_STATS_KEY, {});
  manual[promptId] = {
    ...manual[promptId],
    [field]: Math.max(0, value)
  };
  window.localStorage.setItem(MANUAL_STATS_KEY, JSON.stringify(manual));
  notifyStatsUpdated();
}

export function notifyStatsUpdated() {
  window.dispatchEvent(new CustomEvent("giant:prompt-stats-updated"));
}

function readJson<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
