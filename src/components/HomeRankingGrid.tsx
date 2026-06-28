"use client";

import { useEffect, useMemo, useState } from "react";
import { getLocalPromptStats } from "@/lib/local-stats";
import type { Prompt } from "@/lib/types";
import { PromptCard } from "@/components/PromptCard";

export function HomeRankingGrid({ prompts }: { prompts: Prompt[] }) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener("giant:prompt-stats-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("giant:prompt-stats-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const ranked = useMemo(
    () => [...prompts].sort((a, b) => getLocalPromptStats(b).likes - getLocalPromptStats(a).likes).slice(0, 3),
    [prompts, revision]
  );

  return (
    <div className="prompt-grid">
      {ranked.map((prompt) => (
        <PromptCard prompt={prompt} key={prompt.id} />
      ))}
    </div>
  );
}
