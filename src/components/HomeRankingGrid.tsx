import type { Prompt } from "@/lib/types";
import { PromptCard } from "@/components/PromptCard";

export function HomeRankingGrid({ prompts }: { prompts: Prompt[] }) {
  const ranked = [...prompts].sort((a, b) => b.likes - a.likes).slice(0, 3);

  return (
    <div className="prompt-grid">
      {ranked.map((prompt) => (
        <PromptCard prompt={prompt} key={prompt.id} />
      ))}
    </div>
  );
}
