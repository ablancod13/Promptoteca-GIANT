"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Archive, CheckCircle2, EyeOff, FlaskConical, ShieldCheck, Trash2 } from "lucide-react";
import {
  deletePromptAction,
  moderatePromptStatusAction,
  resolveReportAction,
  togglePromptExperimentalAction,
  togglePromptValidatedAction,
  type ModerationReport
} from "@/app/moderacion/actions";
import type { Prompt, ReviewStatus } from "@/lib/types";

export function ModerationBoard({
  prompts,
  reports
}: {
  prompts: Prompt[];
  reports: ModerationReport[];
}) {
  const [items, setItems] = useState(prompts);
  const [reportItems, setReportItems] = useState(reports);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function setStatus(prompt: Prompt, status: ReviewStatus) {
    startTransition(async () => {
      const result = await moderatePromptStatusAction(prompt.id, status);
      setMessage(result.message);
      if (result.ok) {
        setItems((current) => current.filter((item) => item.id !== prompt.id));
      }
    });
  }

  function deletePrompt(prompt: Prompt) {
    startTransition(async () => {
      const result = await deletePromptAction(prompt.id);
      setMessage(result.message);
      if (result.ok) {
        setItems((current) => current.filter((item) => item.id !== prompt.id));
        setReportItems((current) => current.filter((report) => report.promptId !== prompt.id));
      }
    });
  }

  function toggleExperimental(prompt: Prompt) {
    startTransition(async () => {
      const result = await togglePromptExperimentalAction(prompt.id);
      setMessage(result.message);
      if (result.ok) {
        setItems((current) => current.map((item) => (item.id === prompt.id ? { ...item, experimental: !item.experimental } : item)));
      }
    });
  }

  function toggleValidated(prompt: Prompt) {
    startTransition(async () => {
      const result = await togglePromptValidatedAction(prompt.id);
      setMessage(result.message);
      if (result.ok) {
        setItems((current) =>
          current.map((item) => (item.id === prompt.id ? { ...item, validatedByGiant: !item.validatedByGiant } : item))
        );
      }
    });
  }

  function resolveReport(reportId: string) {
    startTransition(async () => {
      const result = await resolveReportAction(reportId);
      setMessage(result.message);
      if (result.ok) {
        setReportItems((current) => current.filter((report) => report.id !== reportId));
      }
    });
  }

  return (
    <div className="stack">
      {message ? <div className="callout">{message}</div> : null}
      {reportItems.length ? (
        <section className="table-panel stack">
          <div className="section-head compact">
            <h2>Reportes recientes</h2>
            <span className="badge rose">{reportItems.length}</span>
          </div>
          {reportItems.map((report) => (
            <article className="report-row" key={report.id}>
              <div>
                {report.promptSlug ? (
                  <Link href={`/moderacion/prompts/${report.promptSlug}`} target="_blank">
                    <strong>{report.promptTitle}</strong>
                  </Link>
                ) : (
                  <strong>{report.promptTitle}</strong>
                )}
                <p className="muted">
                  {report.reason} · {new Date(report.createdAt).toLocaleDateString("es-ES")}
                </p>
                {report.details ? <p className="muted">{report.details}</p> : null}
              </div>
              <button className="button secondary" type="button" onClick={() => resolveReport(report.id)} disabled={isPending}>
                Revisado
              </button>
            </article>
          ))}
        </section>
      ) : null}

      <section className="table-panel">
        <table className="table">
          <thead>
            <tr>
              <th>Prompt</th>
              <th>Estado</th>
              <th>Señales</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((prompt) => (
              <tr key={prompt.id}>
                <td>
                  <Link href={`/moderacion/prompts/${prompt.slug}`} target="_blank">
                    <strong>{prompt.title}</strong>
                  </Link>
                  <p className="muted">{prompt.summary}</p>
                </td>
                <td>
                  <span className="badge rose">{prompt.reviewStatus}</span>
                </td>
                <td>
                  <div className="badge-row">
                    {prompt.experimental ? <span className="badge amber">Experimental</span> : null}
                    {prompt.likes > 30 ? <span className="badge teal">Alta actividad</span> : null}
                    {["microbiologia clinica", "proa"].includes(normalizeLabel(prompt.category)) ? <span className="badge blue">Revisar riesgo</span> : null}
                  </div>
                </td>
                <td>
                  <div className="action-row">
                    <button className="icon-button" title="Aprobar" type="button" onClick={() => setStatus(prompt, "approved")} disabled={isPending}>
                      <CheckCircle2 size={18} />
                    </button>
                    <button
                      className="icon-button"
                      title="Marcar o desmarcar experimental"
                      type="button"
                      onClick={() => toggleExperimental(prompt)}
                      disabled={isPending}
                    >
                      <FlaskConical size={18} />
                    </button>
                    <button className="icon-button" title="Ocultar" type="button" onClick={() => setStatus(prompt, "hidden")} disabled={isPending}>
                      <EyeOff size={18} />
                    </button>
                    <button className="icon-button" title="Archivar" type="button" onClick={() => setStatus(prompt, "archived")} disabled={isPending}>
                      <Archive size={18} />
                    </button>
                    <button className="icon-button" title="Eliminar" type="button" onClick={() => deletePrompt(prompt)} disabled={isPending}>
                      <Trash2 size={18} />
                    </button>
                    <button className="icon-button" title="Validar GIANT" type="button" onClick={() => toggleValidated(prompt)} disabled={isPending}>
                      <ShieldCheck size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">No hay prompts pendientes en la cola.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
