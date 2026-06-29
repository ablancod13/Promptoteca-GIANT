"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Archive, Clipboard, Edit3, Flag, Heart, Lock, PenLine, Star, Trash2 } from "lucide-react";
import { deletePromptAction, moderatePromptStatusAction } from "@/app/moderacion/actions";
import {
  getPromptInteractionStateAction,
  registerPromptCopyAction,
  registerTemplateUseAction,
  reportPromptAction,
  togglePromptFavoriteAction,
  togglePromptLikeAction,
  updatePromptStatsAction,
  type PromptStatsSnapshot
} from "@/app/prompts/actions";
import { buildCcByCitation, getLicenseUrl } from "@/lib/license";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { canDevelop, canModerate, getLocalUser } from "@/lib/local-user";
import type { Prompt } from "@/lib/types";
import { TemplateWizard } from "@/components/TemplateWizard";

export function PromptDetailClient({ prompt }: { prompt: Prompt }) {
  const router = useRouter();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isGated, setIsGated] = useState(false);
  const [message, setMessage] = useState("");
  const [showTemplate, setShowTemplate] = useState(false);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDetails, setReportDetails] = useState("");
  const [heartPulse, setHeartPulse] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [stats, setStats] = useState<PromptStatsSnapshot>({
    likes: prompt.likes,
    favorites: prompt.favorites,
    copies: prompt.copies,
    templateUses: prompt.templateUses
  });

  useEffect(() => {
    let cancelled = false;
    const user = getLocalUser();
    const registered = Boolean(user);
    setIsRegistered(registered);
    setDeveloperMode(canDevelop(user));
    setCanManage(canModerate(user) || canDevelop(user));
    setStats({
      likes: prompt.likes,
      favorites: prompt.favorites,
      copies: prompt.copies,
      templateUses: prompt.templateUses
    });

    getPromptInteractionStateAction(prompt.id).then((state) => {
      if (cancelled) return;
      setLiked(state.liked);
      setFavorited(state.favorited);
      setStats(state.stats);
    });

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

    return () => {
      cancelled = true;
    };
  }, [prompt.id, prompt.slug, prompt.favorites, prompt.likes, prompt.copies, prompt.templateUses]);

  async function copyPrompt() {
    if (!isRegistered) {
      setMessage("Para copiar prompts debes iniciar sesión o crear una cuenta.");
      return;
    }

    await navigator.clipboard.writeText(prompt.content);
    startTransition(async () => {
      const result = await registerPromptCopyAction(prompt.id);
      setMessage(result.message);
      if (result.ok) setStats(result.state.stats);
    });
    void trackAnalyticsEvent({ type: "copia_prompt", promptId: prompt.id });
  }

  function saveFavorite() {
    if (!isRegistered) {
      setMessage("Para guardar favoritos debes iniciar sesión o crear una cuenta.");
      return;
    }

    const nextFavorited = !favorited;
    setFavorited(nextFavorited);
    setStats((current) => ({ ...current, favorites: Math.max(0, current.favorites + (nextFavorited ? 1 : -1)) }));

    startTransition(async () => {
      const result = await togglePromptFavoriteAction(prompt.id);
      setMessage(result.message);
      if (result.ok) {
        setFavorited(result.state.favorited);
        setStats(result.state.stats);
      } else {
        setFavorited(favorited);
        setStats((current) => ({ ...current, favorites: Math.max(0, current.favorites + (nextFavorited ? -1 : 1)) }));
      }
    });
    void trackAnalyticsEvent({ type: "favorito", promptId: prompt.id });
  }

  function likePrompt() {
    if (!isRegistered) {
      setMessage("Para dar me gusta debes iniciar sesión o crear una cuenta.");
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);
    setHeartPulse((current) => current + 1);
    setStats((current) => ({ ...current, likes: Math.max(0, current.likes + (nextLiked ? 1 : -1)) }));

    startTransition(async () => {
      const result = await togglePromptLikeAction(prompt.id);
      setMessage(result.message);
      if (result.ok) {
        setLiked(result.state.liked);
        setStats(result.state.stats);
      } else {
        setLiked(liked);
        setStats((current) => ({ ...current, likes: Math.max(0, current.likes + (nextLiked ? -1 : 1)) }));
      }
    });
    void trackAnalyticsEvent({ type: "like", promptId: prompt.id });
  }

  function useTemplate() {
    if (!isRegistered) {
      setMessage("Para usar plantillas debes iniciar sesión o crear una cuenta.");
      return;
    }

    setShowTemplate((current) => !current);
    startTransition(async () => {
      const result = await registerTemplateUseAction(prompt.id);
      if (result.ok) setStats(result.state.stats);
    });
    void trackAnalyticsEvent({ type: "uso_plantilla", promptId: prompt.id });
  }

  function reportPrompt() {
    startTransition(async () => {
      const result = await reportPromptAction(prompt.id, "revisión solicitada", reportDetails);
      setMessage(result.message);
      if (result.ok) {
        setReportDetails("");
        setReportOpen(false);
      }
    });
  }

  function archivePrompt() {
    startTransition(async () => {
      const result = await moderatePromptStatusAction(prompt.id, "archived");
      setMessage(result.message);
      if (result.ok) router.push("/prompts");
    });
  }

  function deletePrompt() {
    if (!window.confirm("¿Eliminar este prompt definitivamente?")) return;
    startTransition(async () => {
      const result = await deletePromptAction(prompt.id);
      setMessage(result.message);
      if (result.ok) router.push("/prompts");
    });
  }

  function updateMetric(field: keyof PromptStatsSnapshot, value: number) {
    const nextStats = { ...stats, [field]: Math.max(0, value) };
    setStats(nextStats);

    startTransition(async () => {
      const result = await updatePromptStatsAction(prompt.id, nextStats);
      setMessage(result.message);
      if (result.ok) setStats(result.state.stats);
    });
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
          <span className="muted">El límite se aplica al intentar abrir un segundo prompt completo.</span>
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
          <button className="button primary" type="button" onClick={copyPrompt} disabled={isPending}>
            <Clipboard size={16} /> Copiar prompt
          </button>
          <button className="button secondary" type="button" onClick={useTemplate} disabled={isPending}>
            <PenLine size={16} /> Usar plantilla
          </button>
          <button className="button secondary" type="button" onClick={saveFavorite} disabled={isPending}>
            <Star size={16} fill={favorited ? "currentColor" : "none"} /> {favorited ? "Guardado" : "Guardar"}
          </button>
          <button className={`heart-button ${liked ? "liked" : ""} ${heartPulse ? "heart-pulse" : ""}`} type="button" onClick={likePrompt} aria-pressed={liked}>
            <Heart size={18} fill={liked ? "currentColor" : "none"} /> {liked ? "Te gusta" : "Me gusta"}
          </button>
          <button className="button danger" type="button" onClick={() => setReportOpen((current) => !current)}>
            <Flag size={16} /> Reportar
          </button>
        </div>
        {reportOpen ? (
          <div className="report-box">
            <label className="field">
              <span>Mensaje opcional para moderación</span>
              <textarea
                className="textarea compact-area"
                value={reportDetails}
                maxLength={600}
                onChange={(event) => setReportDetails(event.target.value)}
              />
            </label>
            <button className="button danger" type="button" onClick={reportPrompt} disabled={isPending}>
              <Flag size={16} /> Enviar reporte
            </button>
          </div>
        ) : null}
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
        {canManage ? (
          <div className="moderation-actions stack">
            <strong>Moderación</strong>
            <Link className="button secondary" href={`/moderacion/prompts/${prompt.slug}`}>
              <Edit3 size={16} /> Editar
            </Link>
            <button className="button secondary" type="button" onClick={archivePrompt} disabled={isPending}>
              <Archive size={16} /> Archivar
            </button>
            <button className="button danger" type="button" onClick={deletePrompt} disabled={isPending}>
              <Trash2 size={16} /> Eliminar
            </button>
          </div>
        ) : null}
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
  field: keyof PromptStatsSnapshot;
  editable: boolean;
  onChange: (field: keyof PromptStatsSnapshot, value: number) => void;
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
