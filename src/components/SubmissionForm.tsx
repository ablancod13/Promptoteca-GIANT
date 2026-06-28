"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import {
  AI_MODELS,
  INITIAL_CATEGORIES,
  INTELLIGENCE_LEVELS,
  MODELS_BY_TOOL,
  RECOMMENDED_TOOLS,
  TAXONOMY_STORAGE_KEYS
} from "@/lib/constants";
import { awardLocalXp, getLocalUser } from "@/lib/local-user";
import { detectVariables, slugify } from "@/lib/prompt-utils";
import type { PromptTool } from "@/lib/types";

const LANGUAGE_OPTIONS = ["Español", "Inglés", "Catalán", "Euskera", "Francés", "Italiano", "Otro"];

export function SubmissionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([...INITIAL_CATEGORIES]);
  const [toolOptions, setToolOptions] = useState<string[]>([...RECOMMENDED_TOOLS]);
  const [modelCatalog, setModelCatalog] = useState<string[]>([...AI_MODELS]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("Español");
  const variables = useMemo(() => detectVariables("draft", content), [content]);

  const categories = useMemo(() => [...categoryOptions].sort((a, b) => a.localeCompare(b, "es")), [categoryOptions]);

  const modelOptions = useMemo(() => {
    if (!selectedTools.length) return modelCatalog;

    const matched = selectedTools.flatMap((tool) => {
      const known = MODELS_BY_TOOL[tool as PromptTool] ?? [];
      const inferred = modelCatalog.filter((model) => model.toLowerCase().includes(tool.toLowerCase()));
      return [...known, ...inferred];
    });
    const unique = [...new Set([...matched, "Otro"])].filter((model) => modelCatalog.includes(model) || model === "Otro");
    return unique.length ? unique : ["Otro"];
  }, [modelCatalog, selectedTools]);

  useEffect(() => {
    setIsRegistered(Boolean(getLocalUser()));
    setCategoryOptions(loadList(TAXONOMY_STORAGE_KEYS.categories, [...INITIAL_CATEGORIES]));
    setToolOptions(loadList(TAXONOMY_STORAGE_KEYS.tools, [...RECOMMENDED_TOOLS]));
    setModelCatalog(loadList(TAXONOMY_STORAGE_KEYS.models, [...AI_MODELS]));
  }, []);

  function toggleTool(tool: string, checked: boolean) {
    setSelectedTools((current) => {
      if (checked) return [...new Set([...current, tool])];
      return current.filter((item) => item !== tool);
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTools.length) {
      setMessage("Selecciona al menos una herramienta recomendada.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title"));
    const language = selectedLanguage === "Otro" ? String(form.get("languageOther") ?? "").trim() : selectedLanguage;
    const author = getLocalUser();
    const draft = {
      id: `draft-${Date.now()}`,
      title,
      slug: slugify(title),
      summary: String(form.get("summary")),
      content,
      category: String(form.get("category")),
      authorDisplayName: author?.displayName || author?.name || "Usuario GIANT",
      tools: selectedTools,
      language,
      recommendedModel: String(form.get("recommendedModel") ?? ""),
      intelligenceLevel: String(form.get("intelligenceLevel") ?? ""),
      limitations: String(form.get("limitations") ?? ""),
      misuseRisks: String(form.get("misuseRisks") ?? ""),
      experimental: form.get("experimental") === "on",
      variables,
      reviewStatus: "pending",
      createdAt: new Date().toISOString()
    };
    const existing = window.localStorage.getItem("giant_submitted_prompts");
    const prompts = existing ? (JSON.parse(existing) as unknown[]) : [];
    window.localStorage.setItem("giant_submitted_prompts", JSON.stringify([...prompts, draft]));
    awardLocalXp(`submit:${draft.id}`, 5);
    setSent(true);
    setMessage("Prompt enviado. Puedes compartir otro cuando quieras.");
    setContent("");
    setSelectedTools([]);
    setSelectedLanguage("Español");
    formRef.current?.reset();
    window.setTimeout(() => setSent(false), 1800);
  }

  if (isRegistered === false) {
    return (
      <section className="form-panel stack">
        <span className="eyebrow">Acceso requerido</span>
        <h1>Compartir prompt</h1>
        <p className="lead">Para compartir prompts necesitas iniciar sesión o crear una cuenta.</p>
        <div className="action-row">
          <Link className="button primary" href="/login">
            Entrar
          </Link>
          <Link className="button secondary" href="/registro">
            Registro
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form className={`form-panel stack ${sent ? "sent-form" : ""}`} onSubmit={submit} ref={formRef}>
      <div>
        <span className="eyebrow">Nuevo prompt</span>
        <h1>Compartir prompt</h1>
      </div>
      <div className="grid two">
        <label className="field">
          <span>Título</span>
          <input className="input" name="title" required maxLength={120} />
        </label>
        <label className="field">
          <span>Categoría principal</span>
          <select className="select" name="category" required>
            {categories.map((category) => (
              <option value={category} key={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Herramientas recomendadas</span>
          <div className="checkbox-grid">
            {toolOptions.map((tool) => (
              <label className="check-card" key={tool}>
                <input
                  type="checkbox"
                  name="tools"
                  value={tool}
                  checked={selectedTools.includes(tool)}
                  onChange={(event) => toggleTool(tool, event.target.checked)}
                />
                <span>{tool}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Idioma</span>
          <select className="select" name="language" required value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value)}>
            {LANGUAGE_OPTIONS.map((language) => (
              <option value={language} key={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
        {selectedLanguage === "Otro" ? (
          <label className="field">
            <span>Especificar idioma</span>
            <input className="input" name="languageOther" required maxLength={42} />
          </label>
        ) : null}
        <label className="field">
          <span>Modelo sugerido</span>
          <select className="select" name="recommendedModel">
            <option value="">Sin preferencia</option>
            {modelOptions.map((model) => (
              <option value={model} key={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Nivel de inteligencia sugerido</span>
          <select className="select" name="intelligenceLevel">
            <option value="">Sin preferencia</option>
            {INTELLIGENCE_LEVELS.map((level) => (
              <option value={level} key={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Resumen breve</span>
        <textarea className="textarea" name="summary" required maxLength={360} />
      </label>
      <label className="field">
        <span>Texto completo del prompt</span>
        <textarea className="textarea" required value={content} onChange={(event) => setContent(event.target.value)} />
      </label>
      <div className="grid two">
        <label className="field">
          <span>Limitaciones</span>
          <textarea className="textarea compact-area" name="limitations" maxLength={500} />
        </label>
        <label className="field">
          <span>Riesgos</span>
          <textarea className="textarea compact-area" name="misuseRisks" maxLength={500} />
        </label>
      </div>
      <div className="callout">
        <strong>Variables detectadas</strong>
        <p className="muted">{variables.length ? variables.map((variable) => variable.token).join(", ") : "Sin variables entre corchetes."}</p>
      </div>
      <label className="toggle">
        <input name="noPatientData" type="checkbox" required /> No contiene datos identificables
      </label>
      <label className="toggle">
        <input name="license" type="checkbox" required /> CC BY 4.0
      </label>
      <label className="toggle">
        <input name="experimental" type="checkbox" /> Marcar como experimental
      </label>
      <button className="button primary" type="submit">
        <Send size={17} /> Publicar
      </button>
      {message ? (
        <div className={`callout ${sent ? "success-pulse" : ""}`}>
          {sent ? <CheckCircle2 size={18} /> : null}
          {message}
        </div>
      ) : null}
    </form>
  );
}

function loadList(key: string, fallback: string[]) {
  const stored = window.localStorage.getItem(key);
  return stored ? (JSON.parse(stored) as string[]) : fallback;
}
