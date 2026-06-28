"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Save, ShieldCheck } from "lucide-react";
import { canModerate, getLocalUser } from "@/lib/local-user";
import type { Prompt } from "@/lib/types";

export function PromptEditForm({ prompt, moderation = false }: { prompt: Prompt; moderation?: boolean }) {
  const [message, setMessage] = useState("");
  const [canApproveDirectly, setCanApproveDirectly] = useState(false);

  useEffect(() => {
    setCanApproveDirectly(canModerate(getLocalUser()));
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      id: `edit-${Date.now()}`,
      promptId: prompt.id,
      title: String(form.get("title")),
      summary: String(form.get("summary")),
      content: String(form.get("content")),
      category: String(form.get("category")),
      experimental: form.get("experimental") === "on",
      validatedByGiant: form.get("validatedByGiant") === "on",
      status: canApproveDirectly || moderation ? "approved" : "pending_review",
      createdAt: new Date().toISOString()
    };

    const existing = window.localStorage.getItem("giant_prompt_edits");
    const edits = existing ? (JSON.parse(existing) as unknown[]) : [];
    window.localStorage.setItem("giant_prompt_edits", JSON.stringify([...edits, payload]));
    setMessage(payload.status === "approved" ? "Cambios guardados y aprobados." : "Edición enviada a revisión.");
  }

  return (
    <form className="form-panel stack" onSubmit={submit}>
      <div>
        <span className="eyebrow">{moderation ? "Revisión de moderación" : "Editar prompt"}</span>
        <h1>{prompt.title}</h1>
      </div>
      <label className="field moderator-edit">
        <span>Título</span>
        <input className="input" name="title" defaultValue={prompt.title} required />
      </label>
      <label className="field moderator-edit">
        <span>Resumen</span>
        <textarea className="textarea" name="summary" defaultValue={prompt.summary} required />
      </label>
      <label className="field moderator-edit">
        <span>Texto del prompt</span>
        <textarea className="textarea private-edit" name="content" defaultValue={prompt.content} required />
      </label>
      <label className="field moderator-edit">
        <span>Categoría</span>
        <input className="input" name="category" defaultValue={prompt.category} required />
      </label>
      <div className="badge-row">
        <label className="toggle">
          <input name="experimental" type="checkbox" defaultChecked={prompt.experimental} /> Experimental
        </label>
        <label className="toggle">
          <input name="validatedByGiant" type="checkbox" defaultChecked={prompt.validatedByGiant} /> Validado por GIANT
        </label>
      </div>
      <div className="action-row">
        <button className="button primary" type="submit">
          <Save size={17} /> Guardar cambios
        </button>
        {canApproveDirectly || moderation ? (
          <button className="button accent" type="submit">
            <ShieldCheck size={17} /> Guardar y aprobar
          </button>
        ) : null}
        <Link className="button secondary" href={`/prompts/${prompt.slug}`}>
          Ver prompt
        </Link>
      </div>
      {message ? <div className="callout">{message}</div> : null}
    </form>
  );
}
