"use client";

import { useEffect, useState, useTransition } from "react";
import { Award, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteBadgeDefinitionAction,
  listBadgeDefinitionsAction,
  saveBadgeDefinitionAction,
  type BadgeDefinitionAdmin
} from "@/app/desarrollador/actions";
import { BADGE_RULES, type BadgeRuleKey } from "@/lib/badge-rules";

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
  imageUrl: "",
  imageAlt: "",
  rule: "prompts_shared" as BadgeRuleKey,
  threshold: 1,
  shareable: true
};

export function DeveloperBadgeEditor() {
  const [badges, setBadges] = useState<BadgeDefinitionAdmin[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void refreshBadges();
  }, []);

  async function refreshBadges() {
    setBadges(await listBadgeDefinitionsAction());
  }

  function editBadge(badge: BadgeDefinitionAdmin) {
    setForm({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      imageUrl: badge.imageUrl,
      imageAlt: badge.imageAlt,
      rule: badge.criterion.rule,
      threshold: badge.criterion.threshold,
      shareable: badge.shareable
    });
    setMessage("");
  }

  function saveBadge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = await saveBadgeDefinitionAction(form);
      setMessage(result.message);
      if (!result.ok) return;
      setForm(EMPTY_FORM);
      await refreshBadges();
    });
  }

  function deleteBadge(id: string) {
    if (!window.confirm("¿Eliminar este logro?")) return;
    setMessage("");
    startTransition(async () => {
      const result = await deleteBadgeDefinitionAction(id);
      setMessage(result.message);
      if (result.ok) await refreshBadges();
    });
  }

  async function loadImage(file: File | undefined) {
    if (!file) return;
    if (file.size > 250_000) {
      setMessage("La imagen debe pesar menos de 250 KB. Usa una versión pequeña del icono del logro.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    setForm((current) => ({ ...current, imageUrl: dataUrl, imageAlt: current.imageAlt || current.name || "Logro GIANT" }));
  }

  return (
    <section className="table-panel stack">
      <div className="section-head compact">
        <h2>Logros</h2>
        <span className="badge amber">
          <Award size={14} /> Reglas automáticas
        </span>
      </div>

      <form className="stack" onSubmit={saveBadge}>
        <div className="grid three">
          <label className="field">
            <span>Título del logro</span>
            <input
              className="input"
              value={form.name}
              maxLength={80}
              required
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Regla</span>
            <select
              className="select"
              value={form.rule}
              onChange={(event) => setForm((current) => ({ ...current, rule: event.target.value as BadgeRuleKey }))}
            >
              {BADGE_RULES.map((rule) => (
                <option value={rule.value} key={rule.value}>
                  {rule.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Umbral</span>
            <input
              className="input"
              type="number"
              min={1}
              value={form.threshold}
              onChange={(event) => setForm((current) => ({ ...current, threshold: Number(event.target.value) }))}
            />
          </label>
        </div>

        <label className="field">
          <span>Descripción breve</span>
          <textarea
            className="textarea compact-area"
            value={form.description}
            maxLength={240}
            required
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>

        <div className="grid three">
          <label className="field">
            <span>Imagen del logro</span>
            <input className="input" type="file" accept="image/*" onChange={(event) => void loadImage(event.target.files?.[0])} />
          </label>
          <label className="field">
            <span>URL de imagen</span>
            <input
              className="input"
              value={form.imageUrl}
              placeholder="https://..."
              onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Texto alternativo</span>
            <input
              className="input"
              value={form.imageAlt}
              maxLength={90}
              onChange={(event) => setForm((current) => ({ ...current, imageAlt: event.target.value }))}
            />
          </label>
        </div>

        <div className="action-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={form.shareable}
              onChange={(event) => setForm((current) => ({ ...current, shareable: event.target.checked }))}
            />
            Compartible
          </label>
          {form.imageUrl ? <img className="badge-image" src={form.imageUrl} alt={form.imageAlt || form.name || "Logro"} /> : null}
          <button className="button primary" type="submit" disabled={isPending}>
            {form.id ? <Pencil size={16} /> : <Plus size={16} />} {form.id ? "Guardar cambios" : "Añadir logro"}
          </button>
          {form.id ? (
            <button className="button secondary" type="button" onClick={() => setForm(EMPTY_FORM)} disabled={isPending}>
              Nuevo logro
            </button>
          ) : null}
        </div>
      </form>

      <div className="badge-admin-list">
        {badges.map((badge) => (
          <article className="badge-admin-item" key={badge.id}>
            {badge.imageUrl ? <img className="badge-image" src={badge.imageUrl} alt={badge.imageAlt || badge.name} /> : <ImagePlus size={28} />}
            <div>
              <strong>{badge.name}</strong>
              <p className="muted">{badge.description}</p>
              <span className="badge">{badge.criterionLabel}</span>
            </div>
            <div className="action-row">
              <button className="button secondary" type="button" onClick={() => editBadge(badge)} disabled={isPending}>
                <Pencil size={15} /> Editar
              </button>
              <button className="button danger" type="button" onClick={() => deleteBadge(badge.id)} disabled={isPending}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
      {!badges.length ? <div className="empty-state">Todavía no hay logros configurados.</div> : null}
      {message ? <div className="callout">{message}</div> : null}
    </section>
  );
}
