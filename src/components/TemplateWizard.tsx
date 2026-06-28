"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, Save } from "lucide-react";
import { hydratePromptTemplate } from "@/lib/prompt-utils";
import { awardLocalXp } from "@/lib/local-user";
import type { Prompt } from "@/lib/types";

export function TemplateWizard({ prompt }: { prompt: Prompt }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [status, setStatus] = useState("");
  const variable = prompt.variables[step];
  const generated = useMemo(() => hydratePromptTemplate(prompt.content, values), [prompt.content, values]);

  if (!prompt.variables.length) {
    return <div className="callout">Este prompt no tiene variables detectadas.</div>;
  }

  function updateValue(name: string, value: string | string[]) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function copyGenerated() {
    await navigator.clipboard.writeText(generated);
    setStatus("Prompt personalizado copiado.");
  }

  function saveVersion() {
    const existing = window.localStorage.getItem("giant_custom_versions");
    const versions = existing ? (JSON.parse(existing) as unknown[]) : [];
    window.localStorage.setItem(
      "giant_custom_versions",
      JSON.stringify([
        ...versions,
        {
          id: `${prompt.id}-${Date.now()}`,
          promptId: prompt.id,
          title: prompt.title,
          text: generated,
          values,
          createdAt: new Date().toISOString()
        }
      ])
    );
    awardLocalXp(`custom-version:${prompt.id}:${Object.keys(values).length}`, 2);
    setStatus("Versión privada guardada en este navegador.");
  }

  return (
    <div className="template-box stack">
      <div className="section-head">
        <div>
          <span className="eyebrow">Plantilla interactiva</span>
          <h3>{variable.name}</h3>
        </div>
        <span className="badge">
          {step + 1}/{prompt.variables.length}
        </span>
      </div>
      <VariableInput variable={variable} value={values[variable.name]} onChange={(value) => updateValue(variable.name, value)} />
      <div className="progress-bar" aria-label="Progreso de plantilla">
        <span style={{ width: `${Math.round(((step + 1) / prompt.variables.length) * 100)}%` }} />
      </div>
      <div className="action-row">
        <button className="button secondary" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))}>
          Anterior
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => setStep((current) => Math.min(prompt.variables.length - 1, current + 1))}
        >
          Siguiente
        </button>
        <button className="button primary" type="button" onClick={copyGenerated}>
          <Clipboard size={16} /> Copiar
        </button>
        <button className="button secondary" type="button" onClick={saveVersion}>
          <Save size={16} /> Guardar
        </button>
      </div>
      <pre className="prompt-text">{generated}</pre>
      {status ? (
        <div className="callout">
          <Check size={16} /> {status}
        </div>
      ) : null}
    </div>
  );
}

type WizardVariable = Prompt["variables"][number];

function VariableInput({
  variable,
  value,
  onChange
}: {
  variable: WizardVariable;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  const label = (
    <span>
      {variable.required ? "*" : ""} {variable.helpText ?? "Valor de la variable"}
    </span>
  );

  if (variable.type === "textarea") {
    return (
      <label className="field">
        {label}
        <textarea className="textarea" value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  if (variable.type === "select") {
    return (
      <label className="field">
        {label}
        <select className="select" value={(value as string) ?? variable.defaultValue ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">Selecciona</option>
          {variable.options.map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="field">
      {label}
      <input
        className="input"
        type={variable.type === "number" ? "number" : variable.type === "date" ? "date" : "text"}
        value={(value as string) ?? variable.defaultValue ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
