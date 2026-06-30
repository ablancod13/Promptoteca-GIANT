"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, Plus, Send, X } from "lucide-react";
import { getCurrentProfileAction } from "@/app/auth/actions";
import { submitPromptAction } from "@/app/subir/actions";
import { AI_MODELS, INITIAL_CATEGORIES, INTELLIGENCE_LEVELS, MODELS_BY_TOOL, RECOMMENDED_TOOLS } from "@/lib/constants";
import { getLocalUser, saveLocalUser } from "@/lib/local-user";
import { detectVariables } from "@/lib/prompt-utils";
import type { SubmissionModelOption } from "@/lib/repository";
import type { Difficulty, PromptTool } from "@/lib/types";

const LANGUAGE_OPTIONS = ["Español", "Inglés", "Catalán", "Euskera", "Francés", "Italiano", "Otro"];
const DIFFICULTY_OPTIONS: Array<{ value: Difficulty; label: string }> = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" }
];

interface SubmissionFormProps {
  initialCategories?: string[];
  initialTools?: string[];
  initialModels?: string[];
  initialModelOptions?: SubmissionModelOption[];
  popularTags?: string[];
}

export function SubmissionForm({
  initialCategories = [...INITIAL_CATEGORIES],
  initialTools = [...RECOMMENDED_TOOLS],
  initialModels = [...AI_MODELS],
  initialModelOptions,
  popularTags = []
}: SubmissionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("Español");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const variables = useMemo(() => detectVariables("draft", content), [content]);

  const categories = useMemo(() => [...initialCategories].sort((a, b) => a.localeCompare(b, "es")), [initialCategories]);
  const tools = useMemo(() => [...initialTools].sort((a, b) => a.localeCompare(b, "es")), [initialTools]);
  const tagSuggestions = useMemo(
    () => [...new Set(popularTags.map(normalizeTag).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")).slice(0, 24),
    [popularTags]
  );
  const modelCatalog = useMemo(
    () =>
      (initialModelOptions?.length
        ? initialModelOptions
        : initialModels.map((name) => ({ name, toolName: inferToolForModel(name) }))
      ).sort((a, b) => a.name.localeCompare(b.name, "es")),
    [initialModelOptions, initialModels]
  );

  const filteredModels = useMemo(() => {
    if (!selectedTools.length) return uniqueModelNames(modelCatalog);

    const matched = modelCatalog.filter((model) =>
      selectedTools.some((tool) => {
        const known = MODELS_BY_TOOL[tool as PromptTool] ?? [];
        return model.toolName === tool || known.includes(model.name) || model.name.toLocaleLowerCase("es").includes(tool.toLocaleLowerCase("es"));
      })
    );

    const names = uniqueModelNames(matched);
    return names.includes("Otro") ? names : [...names, "Otro"];
  }, [modelCatalog, selectedTools]);

  useEffect(() => {
    const localUser = getLocalUser();
    setIsRegistered(Boolean(localUser));

    getCurrentProfileAction().then((remoteUser) => {
      if (remoteUser) {
        saveLocalUser(remoteUser);
        setIsRegistered(true);
      } else {
        setIsRegistered(Boolean(getLocalUser()));
      }
    });
  }, []);

  function toggleTool(tool: string, checked: boolean) {
    setSelectedTools((current) => {
      if (checked) return [...new Set([...current, tool])];
      return current.filter((item) => item !== tool);
    });
  }

  function toggleTag(tag: string) {
    const clean = normalizeTag(tag);
    if (!clean) return;
    setSelectedTags((current) => (current.includes(clean) ? current.filter((item) => item !== clean) : [...current, clean].slice(0, 8)));
  }

  function addTag() {
    const clean = normalizeTag(tagDraft);
    if (!clean) return;
    setSelectedTags((current) => (current.includes(clean) ? current : [...current, clean].slice(0, 8)));
    setTagDraft("");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTools.length) {
      setMessage("Selecciona al menos una herramienta recomendada.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const language = selectedLanguage === "Otro" ? String(form.get("languageOther") ?? "").trim() : selectedLanguage;
    setMessage("");

    startTransition(async () => {
      const result = await submitPromptAction({
        title: String(form.get("title") ?? ""),
        summary: String(form.get("summary") ?? ""),
        content,
        category: String(form.get("category") ?? ""),
        tools: selectedTools,
        language,
        difficulty: String(form.get("difficulty") ?? "principiante") as Difficulty,
        tags: selectedTags,
        recommendedModel: String(form.get("recommendedModel") ?? ""),
        intelligenceLevel: String(form.get("intelligenceLevel") ?? ""),
        limitations: String(form.get("limitations") ?? ""),
        misuseRisks: String(form.get("misuseRisks") ?? ""),
        experimental: form.get("experimental") === "on",
        noPatientDataConfirmed: form.get("noPatientData") === "on",
        licenseAccepted: form.get("license") === "on"
      });

      setMessage(result.message);
      if (!result.ok) return;

      if (result.user) saveLocalUser(result.user);
      setSent(true);
      setContent("");
      setSelectedTools([]);
      setSelectedTags([]);
      setSelectedLanguage("Español");
      formRef.current?.reset();
      window.setTimeout(() => setSent(false), 1800);
    });
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
            {tools.map((tool) => (
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
          <span>Dificultad</span>
          <select className="select" name="difficulty" defaultValue="principiante">
            {DIFFICULTY_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Modelo sugerido</span>
          <select className="select" name="recommendedModel">
            <option value="">Sin preferencia</option>
            {filteredModels.map((model) => (
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
      <div className="field">
        <span>Tags</span>
        <div className="badge-row">
          {tagSuggestions.map((tag) => (
            <button className={`tag-chip ${selectedTags.includes(tag) ? "selected" : ""}`} type="button" key={tag} onClick={() => toggleTag(tag)}>
              {tag}
            </button>
          ))}
        </div>
        <div className="action-row">
          <input
            className="input"
            value={tagDraft}
            maxLength={40}
            placeholder="Añadir palabra clave"
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag();
              }
            }}
          />
          <button className="button secondary" type="button" onClick={addTag}>
            <Plus size={16} /> Añadir
          </button>
        </div>
        {selectedTags.length ? (
          <div className="badge-row">
            {selectedTags.map((tag) => (
              <span className="badge" key={tag}>
                {tag}
                <button className="chip-remove" type="button" onClick={() => toggleTag(tag)} title="Quitar tag">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
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
      <button className="button primary" type="submit" disabled={isPending}>
        <Send size={17} /> {isPending ? "Publicando..." : "Publicar"}
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

function uniqueModelNames(models: SubmissionModelOption[]) {
  return [...new Set(models.map((model) => model.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function inferToolForModel(name: string) {
  return (Object.keys(MODELS_BY_TOOL) as PromptTool[]).find((tool) => MODELS_BY_TOOL[tool].includes(name));
}

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 40);
}
