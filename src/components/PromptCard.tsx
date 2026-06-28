"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, FlaskConical, Heart, Languages, Sparkles } from "lucide-react";
import { awardLocalXp, getLocalUser } from "@/lib/local-user";
import { getLocalPromptStats, notifyStatsUpdated, type LocalPromptStats } from "@/lib/local-stats";
import type { Prompt } from "@/lib/types";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [stats, setStats] = useState<LocalPromptStats>({
    likes: prompt.likes,
    favorites: prompt.favorites,
    copies: prompt.copies,
    templateUses: prompt.templateUses
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    const existing = window.localStorage.getItem("giant_likes");
    const likes = existing ? (JSON.parse(existing) as string[]) : [];
    setLiked(likes.includes(prompt.id));
    setStats(getLocalPromptStats(prompt));

    const refresh = () => setStats(getLocalPromptStats(prompt));
    window.addEventListener("giant:prompt-stats-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("giant:prompt-stats-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [prompt.id]);

  function toggleLike(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!getLocalUser()) {
      setStatus("Inicia sesión para marcar me gusta.");
      return;
    }

    const existing = window.localStorage.getItem("giant_likes");
    const likes = new Set(existing ? (JSON.parse(existing) as string[]) : []);
    if (likes.has(prompt.id)) {
      likes.delete(prompt.id);
      setLiked(false);
    } else {
      likes.add(prompt.id);
      setLiked(true);
      awardLocalXp(`like:${prompt.id}`, 1);
    }
    window.localStorage.setItem("giant_likes", JSON.stringify(Array.from(likes)));
    notifyStatsUpdated();
    setStats(getLocalPromptStats(prompt));
    setStatus("");
  }

  return (
    <article
      className="card prompt-card prompt-card-link"
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/prompts/${prompt.slug}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter") router.push(`/prompts/${prompt.slug}`);
      }}
    >
      <div className="stack">
        <div className="badge-row">
          <Link
            className="badge teal"
            href={`/categorias/${encodeURIComponent(prompt.category)}`}
            onClick={(event) => event.stopPropagation()}
          >
            {prompt.category}
          </Link>
          {prompt.validatedByGiant ? (
            <span className="badge blue">
              <CheckCircle2 size={14} /> Validado GIANT
            </span>
          ) : null}
          {prompt.experimental ? (
            <span className="badge amber">
              <FlaskConical size={14} /> Experimental
            </span>
          ) : null}
          {prompt.reviewStatus === "pending" ? <span className="badge rose">En revisión</span> : null}
        </div>
        <div>
          <h3>{prompt.title}</h3>
          <p>{prompt.summary}</p>
        </div>
        <div className="meta-row muted">
          <Link
            className="meta-chip"
            href={`/prompts?autor=${encodeURIComponent(prompt.author.displayName)}`}
            onClick={(event) => event.stopPropagation()}
          >
            {prompt.author.displayName}
          </Link>
          <span>{prompt.difficulty}</span>
          <span>
            <Languages size={14} /> {prompt.language}
          </span>
        </div>
        <div className="badge-row">
          {prompt.tools.slice(0, 3).map((tool) => (
            <span className="badge" key={tool}>
              {tool}
            </span>
          ))}
          {prompt.recommendedModel ? <span className="badge amber">{prompt.recommendedModel}</span> : null}
        </div>
      </div>
      <div className="stack">
        <div className="meta-row muted">
          <button
            className={`heart-button ${liked ? "liked" : ""}`}
            type="button"
            title={liked ? "Quitar me gusta" : "Me gusta"}
            onClick={toggleLike}
          >
            <Heart size={17} fill={liked ? "currentColor" : "none"} /> {stats.likes}
          </button>
          <span>
            <Copy size={15} /> {stats.copies}
          </span>
          <span>
            <Sparkles size={15} /> {stats.templateUses}
          </span>
        </div>
        {status ? <small className="muted">{status}</small> : null}
      </div>
    </article>
  );
}
