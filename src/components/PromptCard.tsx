"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Copy, FlaskConical, Heart, Languages, Sparkles } from "lucide-react";
import { getPromptInteractionStateAction, togglePromptLikeAction, type PromptStatsSnapshot } from "@/app/prompts/actions";
import { getLocalUser } from "@/lib/local-user";
import type { Prompt } from "@/lib/types";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [stats, setStats] = useState<PromptStatsSnapshot>({
    likes: prompt.likes,
    favorites: prompt.favorites,
    copies: prompt.copies,
    templateUses: prompt.templateUses
  });
  const [status, setStatus] = useState("");
  const [pulseKey, setPulseKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setStats({
      likes: prompt.likes,
      favorites: prompt.favorites,
      copies: prompt.copies,
      templateUses: prompt.templateUses
    });

    getPromptInteractionStateAction(prompt.id).then((state) => {
      if (cancelled) return;
      setLiked(state.liked);
      setStats(state.stats);
    });

    return () => {
      cancelled = true;
    };
  }, [prompt.id, prompt.favorites, prompt.likes, prompt.copies, prompt.templateUses]);

  function toggleLike(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!getLocalUser()) {
      setStatus("Inicia sesión para marcar me gusta.");
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);
    setPulseKey((current) => current + 1);
    setStats((current) => ({ ...current, likes: Math.max(0, current.likes + (nextLiked ? 1 : -1)) }));

    startTransition(async () => {
      const result = await togglePromptLikeAction(prompt.id);
      setStatus(result.message);
      if (result.ok) {
        setLiked(result.state.liked);
        setStats(result.state.stats);
      } else {
        setLiked(liked);
        setStats((current) => ({ ...current, likes: Math.max(0, current.likes + (nextLiked ? -1 : 1)) }));
      }
    });
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
            className={`heart-button ${liked ? "liked" : ""} ${pulseKey ? "heart-pulse" : ""}`}
            type="button"
            title={liked ? "Quitar me gusta" : "Me gusta"}
            onClick={toggleLike}
            aria-pressed={liked}
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
