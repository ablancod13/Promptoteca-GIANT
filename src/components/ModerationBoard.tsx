"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, EyeOff, FlaskConical, ShieldCheck, Trash2 } from "lucide-react";
import type { Prompt, ReviewStatus } from "@/lib/types";

interface LocalReport {
  id: string;
  promptId: string;
  promptSlug?: string;
  promptTitle?: string;
  createdAt: string;
  reason: string;
  status?: "open" | "resolved";
}

export function ModerationBoard({ prompts, allPrompts }: { prompts: Prompt[]; allPrompts: Prompt[] }) {
  const [items, setItems] = useState(prompts);
  const [reports, setReports] = useState<LocalReport[]>([]);

  useEffect(() => {
    const refreshReports = () => {
      const stored = window.localStorage.getItem("giant_reports");
      setReports(stored ? (JSON.parse(stored) as LocalReport[]).filter((report) => report.status !== "resolved") : []);
    };
    refreshReports();
    window.addEventListener("giant:reports-updated", refreshReports);
    window.addEventListener("storage", refreshReports);
    return () => {
      window.removeEventListener("giant:reports-updated", refreshReports);
      window.removeEventListener("storage", refreshReports);
    };
  }, []);

  function setStatus(id: string, status: ReviewStatus) {
    setItems((current) =>
      current
        .map((prompt) => (prompt.id === id ? { ...prompt, reviewStatus: status } : prompt))
        .filter((prompt) => prompt.id !== id)
    );
  }

  function toggleExperimental(id: string) {
    setItems((current) => current.map((prompt) => (prompt.id === id ? { ...prompt, experimental: !prompt.experimental } : prompt)));
  }

  function toggleValidated(id: string) {
    setItems((current) => current.map((prompt) => (prompt.id === id ? { ...prompt, validatedByGiant: !prompt.validatedByGiant } : prompt)));
  }

  function resolveReport(id: string) {
    const stored = window.localStorage.getItem("giant_reports");
    const current = stored ? (JSON.parse(stored) as LocalReport[]) : [];
    const next = current.map((report) => (report.id === id ? { ...report, status: "resolved" as const } : report));
    window.localStorage.setItem("giant_reports", JSON.stringify(next));
    setReports(next.filter((report) => report.status !== "resolved"));
  }

  return (
    <div className="stack">
      {reports.length ? (
        <section className="table-panel stack">
          <div className="section-head compact">
            <h2>Reportes recientes</h2>
            <span className="badge rose">{reports.length}</span>
          </div>
          {reports.map((report) => {
            const prompt = allPrompts.find((item) => item.id === report.promptId);
            const slug = report.promptSlug ?? prompt?.slug;
            return (
              <article className="report-row" key={report.id}>
                <div>
                  {slug ? (
                    <Link href={`/moderacion/prompts/${slug}`} target="_blank">
                      <strong>{report.promptTitle ?? prompt?.title ?? "Prompt reportado"}</strong>
                    </Link>
                  ) : (
                    <strong>{report.promptTitle ?? "Prompt reportado"}</strong>
                  )}
                  <p className="muted">{report.reason} · {new Date(report.createdAt).toLocaleDateString("es-ES")}</p>
                </div>
                <button className="button secondary" type="button" onClick={() => resolveReport(report.id)}>
                  Revisado
                </button>
              </article>
            );
          })}
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
                    {prompt.category === "Microbiologia clinica" || prompt.category === "PROA" ? <span className="badge blue">Revisar riesgo</span> : null}
                  </div>
                </td>
                <td>
                  <div className="action-row">
                    <button className="icon-button" title="Aprobar" type="button" onClick={() => setStatus(prompt.id, "approved")}>
                      <CheckCircle2 size={18} />
                    </button>
                    <button className="icon-button" title="Marcar o desmarcar experimental" type="button" onClick={() => toggleExperimental(prompt.id)}>
                      <FlaskConical size={18} />
                    </button>
                    <button className="icon-button" title="Ocultar" type="button" onClick={() => setStatus(prompt.id, "hidden")}>
                      <EyeOff size={18} />
                    </button>
                    <button className="icon-button" title="Eliminar" type="button" onClick={() => setStatus(prompt.id, "rejected")}>
                      <Trash2 size={18} />
                    </button>
                    <button className="icon-button" title="Validar GIANT" type="button" onClick={() => toggleValidated(prompt.id)}>
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
