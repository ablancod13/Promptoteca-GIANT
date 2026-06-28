"use client";

import { getProgressToNextLevel } from "@/lib/gamification";

interface LevelAvatarProps {
  xp: number;
  size?: "sm" | "md" | "lg";
}

export function LevelAvatar({ xp, size = "md" }: LevelAvatarProps) {
  const { current } = getProgressToNextLevel(xp);
  const tone = current.level >= 7 ? "legend" : current.level >= 5 ? "expert" : current.level >= 3 ? "active" : "starter";

  return (
    <span className={`level-avatar ${tone} ${size}`} title={`${current.name} · nivel ${current.level}`}>
      <span>N{current.level}</span>
    </span>
  );
}
