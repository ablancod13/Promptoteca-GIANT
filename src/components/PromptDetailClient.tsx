"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clipboard, Flag, Heart, Lock, PenLine, Star } from "lucide-react";
import { buildCcByCitation, getLicenseUrl } from "@/lib/license";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { awardLocalXp, canDevelop, getLocalUser } from "@/lib/local-user";
import { getLocalPromptStats, incrementLocalCopy, notifyStatsUpdated, updateManualPromptStat, type LocalPromptStats } from "@/lib/local-stats";
import type { Prompt } from "@/lib/types";
import { TemplateWizard } from "@/components/TemplateWizard";

export function PromptDetailClient({ prompt }: { prompt: Prompt }) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isGated, setIsGated] = useState(false);
  const [message, setMessage] = useState("");
  const [showTemplate, setShowTemplate] = useState(false);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [stats, setStats] = useState<LocalPromptStats>({
    likes: prompt.likes,
    favorites: prompt.favorites,
    copies: prompt.copies,
    templateUses: prompt.templateUses
  });

  useEffect(() => {
    const user = getLocalUser();
    const registered = Boolean(user);
    setIsRegistered(registered);
    setDeveloperMode(canDevelop(user));
    const likes = window.localStorage.getItem("giant_likes");
    const favorites = window.localStorage.getItem("giant_favorites");
    setLiked(likes ? (JSON.parse(likes) as string[]).includes(prompt.id) : false);
    setFavorited(favorites ? (JSON.parse(favorites) as string[]).includes(prompt.id) : false);
    setStats(getLocalPromptStats(prompt));

    if (!registered) {
      const opened = window.localStorage.getItem("giant_first_prompt_opened");
      if (opened && opened !== prompt.slug) {
        setIsGated(true);
        void trackAnalyticsEvent({ type: "bloqueo_segundo_prompt", promptId: prompt.id });
      } else {
        window.localStorage.setItem("giant_first_prompt_opened", prompt.slug);
      }
    }

    void trackAnalyticsEvent({ type: "apertura_prompt", promptId: prompt.id });

    const refreshStats = () => setStats(getLocalPromptStats(prompt));
    window.addEventListener("giant:prompt-stats-updated", refreshStats);
    window.addEventListener("storage", refreshStats);
    return () => {
      window.removeEventListener("giant:prompt-stats-updated", refreshStats);
      window.removeEventListener("storage", refreshStats);
    };
  }, [prompt.id, prompt.slug]);

  async function copyPrompt() {
    if (!isRegistered) {
      setMessage("Para copiar prompts debes iniciar sesión o crear una cuenta.");
      return;
    }
    await navigator.clipboard.writeText(prompt.content);
    incrementLocalCopy(prompt.id);
    setStats(getLocalPromptStats(prompt));
    setMessage("Prompt copiado.");
    awardLocalXp(`copy:${prompt.id}`, 2);
    void trackAnalyticsEvent({ type: "copia_prompt", promptId: prompt.id });
  }

  function saveFavorite() {
    if (!isRegistered) {
      setMessage("Para guardar favoritos debes iniciar sesión o crear una cuenta.");
      return;
    }
    const existing = window.localStorage.getItem("giant_favorites");
    const favorites = new Set(existing ? (JSON.parse(existing) as string[]) : []);
    if (favorites.has(prompt.id)) {
      favorites.delete(prompt.id);
      setFavorited(false);
      setMessage("Eliminado de favoritos.");
    } else {
      favorites.add(prompt.id);
      setFavorited(true);
      setMessage("Guardado en favoritos.");
      awardLocalXp(`favorite:${prompt.id}`, 1);
    }
    window.localStorage.setItem("giant_favorites", JSON.stringify(Array.from(favorites)));
    notifyStatsUpdated();
    setStats(getLocalPromptStats(prompt));
    void trackAnalyticsEvent({ type: "favorito", promptId: prompt.id });
  }

  function likePrompt() {
    if (!isRegistered) {
      setMessage("Para dar me gusta debes iniciar sesión o crear una cuenta.");
      return;
    }
    const existing = window.localStorage.getItem("giant_likes");
    const likes = new Set(existing ? (JSON.parse(existing) as string[]) : []);
    if (likes.has(prompt.id)) {
      likes.delete(prompt.id);
      setLiked(false);
      setMessage("Me gusta eliminado.");
    } else {
      likes.add(prompt.id);
      setLiked(true);
      setMessage("Me gusta registrado.");
      awardLocalXp(`like:${prompt.id}`, 1);
    }
    window.localStorage.setItem("giant_likes", JSON.stringify(Array.from(likes)));
    notifyStatsUpdated();
    setStats(getLocalPromptStats(prompt));
    void trackAnalyticsEvent({ type: "like", promptId: prompt.id });
  }

  function reportPrompt() {
    const existing = window.localStorage.getItem("giant_reports");
    const reports = existing ? (JSON.parse(existing) as unknown[]) : [];
    window.localStorage.setItem(
      "giant_reports",
      JSON.stringify([
        ...reports,
        {
          id: `report-${prompt.id}-${Date.now()}`,
          promptId: prompt.id,
          promptSlug: prompt.slug,
          promptTitle: prompt.title,
          createdAt: new Date().toISOString(),
          reason: "revisión solicitada",
          status: "open"
        }
      ])
    );
    window.dispatchEvent(new CustomEvent("giant:reports-updated"));
    setMessage("Reporte enviado a moderación.");
  }

  function updateMetric(field: keyof LocalPromptStats, value: number) {
    updateManualPromptStat(prompt.id, field, value);
    setStats(getLocalPromptStats(prompt));
  }

  if (isGated) {
    return (
      <div className="prompt-detail">
        <section className="prompt-body stack">
          <div className="callout warning">
            <h1>Has consultado tu primer prompt</h1>
            <p>
              Para seguir explorando, copiar prompts, guardar favoritos y crear tu biblioteca personal, inicia sesión o crea una cuenta.
            </p>
            <div className="action-row">
              <Link className="button primary" href="/registro">
                Crear cuenta
              </Link>
              <Link className="button secondary" href="/login">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </section>
        <aside className="side-panel stack">
          <Lock size={28} />
          <strong>Acceso de visitante agotado</strong>
          <span className="muted">El limite se aplica al intentar abrir un segundo prompt completo.</span>
        </aside>
      </div>
    );
  }

  return (
    <div className="prompt-detail">
      <section className="prompt-body stack">
        <div className="badge-row">
          <span className="badge teal">{prompt.category}</span>
          {prompt.validatedByGiant ? <span className="badge blue">Validado GIANT</span> : null}
          {prompt.experimental ? <span className="badge amber">Experimental</span> : null}
          {prompt.reviewStatus === "pending" ? <span className="badge rose">En revisión</span> : null}
        </div>
        <h1>{prompt.title}</h1>
        <p className="lead">{prompt.summary}</p>
        <div className="meta-box-grid">
          <Link className="meta-box author-box" href={`/prompts?autor=${encodeURIComponent(prompt.author.displayName)}`}>
            <small>Autor</small>
            <strong>{prompt.author.displayName}</strong>
          </Link>
          <span className="meta-box">
            <small>Tags</small>
            <strong>{prompt.tags.slice(0, 3).join(", ") || "Sin tags"}</strong>
          </span>
          <span className="meta-box">
            <small>Idioma</small>
            <strong>{prompt.language}</strong>
          </span>
          <span className="meta-box">
            <small>Nivel</small>
            <strong>{prompt.difficulty}</strong>
          </span>
        </div>
        <span className="muted">Primera publicación: {new Date(prompt.publishedAt).toLocaleDateString("es-ES")}</span>
        <pre className="prompt-text">{prompt.content}</pre>
        <div className="action-row">
          <button className="button primary" type="button" onClick={copyPrompt}>
            <Clipboard size={16} /> Copiar prompt
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              if (!isRegistered) {
                setMessage("Para usar plantillas debes iniciar sesión o crear una cuenta.");
                return;
              }
              setShowTemplate((current) => !current);
              awardLocalXp(`template:${prompt.id}`, 2);
              void trackAnalyticsEvent({ type: "uso_plantilla", promptId: prompt.id });
            }}
          >
            <PenLine size={16} /> Usar plantilla
          </button>
          <button className="button secondary" type="button" onClick={saveFavorite}>
            <Star size={16} fill={favorited ? "currentColor" : "none"} /> {favorited ? "Guardado" : "Guardar"}
          </button>
          <button className={`heart-button ${liked ? "liked" : ""}`} type="button" onClick={likePrompt}>
            <Heart size={18} fill={liked ? "currentColor" : "none"} /> {liked ? "Te gusta" : "Me gusta"}
          </button>
          <button className="button danger" type="button" onClick={reportPrompt}>
            <Flag size={16} /> Reportar
          </button>
        </div>
        {message ? <div className="callout">{message}</div> : null}
        {showTemplate ? <TemplateWizard prompt={prompt} /> : null}
      </section>
      <aside className="side-panel stack">
        <h3>Ficha del prompt</h3>
        <div className="badge-row">
          {prompt.tools.map((tool) => (
            <span className="badge" key={tool}>
              {tool}
            </span>
          ))}
        </div>
        <div className="grid two">
          <Metric label="Likes" value={stats.likes} field="likes" editable={developerMode} onChange={updateMetric} />
          <Metric label="Usos" value={stats.copies} field="copies" editable={developerMode} onChange={updateMetric} />
          <Metric label="Favoritos" value={stats.favorites} field="favorites" editable={developerMode} onChange={updateMetric} />
          <Metric label="Plantillas" value={stats.templateUses} field="templateUses" editable={developerMode} onChange={updateMetric} />
        </div>
        <div>
          <strong>Variables detectadas</strong>
          <p className="muted">{prompt.variables.length ? prompt.variables.map((item) => item.token).join(", ") : "Sin variables"}</p>
        </div>
        {prompt.recommendedModel || prompt.intelligenceLevel ? (
          <div>
            <strong>Configuración sugerida</strong>
            <p className="muted">
              {[prompt.recommendedModel, prompt.intelligenceLevel].filter(Boolean).join(" · ") || "Sin preferencia"}
            </p>
          </div>
        ) : null}
        <div>
          <strong>Limitaciones</strong>
          <p className="muted">{prompt.limitations}</p>
        </div>
        <div>
          <strong>Riesgos</strong>
          <p className="muted">{prompt.misuseRisks}</p>
        </div>
        <div>
          <strong>Licencia</strong>
          <p className="muted">
            <a href={getLicenseUrl()} target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
          </p>
        </div>
        <div className="callout">
          <small>{buildCcByCitation(prompt)}</small>
        </div>
      </aside>
    </div>
  );
}

function Metric({
  label,
  value,
  field,
  editable,
  onChange
}: {
  label: string;
  value: number;
  field: keyof LocalPromptStats;
  editable: boolean;
  onChange: (field: keyof LocalPromptStats, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function save() {
    const next = Number(draft);
    if (Number.isFinite(next)) onChange(field, next);
    setEditing(false);
  }

  return (
    <div
      className={`metric ${editable ? "editable-metric" : ""}`}
      title={editable ? "Doble clic para editar" : undefined}
      onDoubleClick={() => {
        if (editable) setEditing(true);
      }}
    >
      {editing ? (
        <input
          className="input stat-input"
          autoFocus
          type="number"
          min={0}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <strong>{value}</strong>
      )}
      <span>{label}</span>
    </div>
  );
}
