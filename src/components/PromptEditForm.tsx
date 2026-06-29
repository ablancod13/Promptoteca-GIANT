"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Save, ShieldCheck, Trash2 } from "lucide-react";
import { deletePromptAction, moderatePromptStatusAction, saveModeratedPromptAction } from "@/app/moderacion/actions";
import { canModerate, getLocalUser } from "@/lib/local-user";
import type { Prompt } from "@/lib/types";

export function PromptEditForm({ prompt, moderation = false }: { prompt: Prompt; moderation?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [canApproveDirectly, setCanApproveDirectly] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCanApproveDirectly(canModerate(getLocalUser()));
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const approve = moderation || submitter?.value === "approve";

    startTransition(async () => {
      const result = await saveModeratedPromptAction({
        promptId: prompt.id,
        slug: prompt.slug,
        title: String(form.get("title") ?? ""),
        summary: String(form.get("summary") ?? ""),
        content: String(form.get("content") ?? ""),
        category: String(form.get("category") ?? ""),
        experimental: form.get("experimental") === "on",
        validatedByGiant: form.get("validatedByGiant") === "on",
        approve
      });

      setMessage(result.message);
    });
  }

  function archivePrompt() {
    startTransition(async () => {
      const result = await moderatePromptStatusAction(prompt.id, "archived");
      setMessage(result.message);
      if (result.ok) router.push("/moderacion");
    });
  }

  function deletePrompt() {
    if (!window.confirm("¿Eliminar este prompt definitivamente?")) return;
    startTransition(async () => {
      const result = await deletePromptAction(prompt.id);
      setMessage(result.message);
      if (result.ok) router.push("/moderacion");
    });
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
        <button className="button primary" type="submit" name="intent" value="save" disabled={isPending}>
          <Save size={17} /> Guardar cambios
        </button>
        {canApproveDirectly || moderation ? (
          <button className="button accent" type="submit" name="intent" value="approve" disabled={isPending}>
            <ShieldCheck size={17} /> Guardar y aprobar
          </button>
        ) : null}
        {canApproveDirectly || moderation ? (
          <>
            <button className="button secondary" type="button" onClick={archivePrompt} disabled={isPending}>
              <Archive size={17} /> Archivar
            </button>
            <button className="button danger" type="button" onClick={deletePrompt} disabled={isPending}>
              <Trash2 size={17} /> Eliminar
            </button>
          </>
        ) : null}
        <Link className="button secondary" href={`/prompts/${prompt.slug}`}>
          Ver prompt
        </Link>
      </div>
      {message ? <div className="callout">{message}</div> : null}
    </form>
  );
}
