"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RECOMMENDED_TOOLS, TAXONOMY_STORAGE_KEYS } from "@/lib/constants";
import { applyPromptFilters } from "@/lib/prompt-utils";
import type { Difficulty, Prompt, PromptFilters } from "@/lib/types";
import { PromptCard } from "@/components/PromptCard";

interface PromptExplorerProps {
  prompts: Prompt[];
  categories: string[];
  initialCategory?: string;
  initialAuthor?: string;
}

export function PromptExplorer({ prompts, categories, initialCategory = "", initialAuthor = "" }: PromptExplorerProps) {
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [toolOptions, setToolOptions] = useState<string[]>(RECOMMENDED_TOOLS);
  const [filters, setFilters] = useState<PromptFilters>({
    query: "",
    category: initialCategory,
    author: initialAuthor,
    tool: "",
    language: "",
    difficulty: "todas",
    sort: "recientes"
  });
  const [serverResults, setServerResults] = useState<Prompt[] | null>(null);

  const localResults = useMemo(() => applyPromptFilters(prompts, filters), [filters, prompts]);
  const results = serverResults ?? localResults;
  const languages = Array.from(new Set(prompts.flatMap((prompt) => [prompt.language, prompt.bestLanguage]))).sort();

  useEffect(() => {
    const storedCategories = window.localStorage.getItem(TAXONOMY_STORAGE_KEYS.categories);
    const storedTools = window.localStorage.getItem(TAXONOMY_STORAGE_KEYS.tools);
    const nextCategories = storedCategories ? (JSON.parse(storedCategories) as string[]) : categories;
    const nextTools = storedTools ? (JSON.parse(storedTools) as string[]) : RECOMMENDED_TOOLS;
    setCategoryOptions([...new Set(nextCategories)].sort((a, b) => a.localeCompare(b, "es")));
    setToolOptions([...new Set(nextTools)].sort((a, b) => a.localeCompare(b, "es")));
  }, [categories]);

  useEffect(() => {
    const query = filters.query?.trim();
    if (!query) {
      setServerResults(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...filters, semantic: true }),
          signal: controller.signal
        });
        const payload = (await response.json()) as { prompts: Prompt[] };
        setServerResults(payload.prompts);
      } catch (error) {
        if (!controller.signal.aborted) {
          setServerResults(null);
        }
      }
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [filters]);

  async function runSearch() {
    if (!filters.query?.trim()) {
      setServerResults(null);
      return;
    }

    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...filters, semantic: true })
    });
    const payload = (await response.json()) as { prompts: Prompt[] };
    setServerResults(payload.prompts);
  }

  function patchFilter<K extends keyof PromptFilters>(key: K, value: PromptFilters[K]) {
    setServerResults(null);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section>
      <div className="filters">
        <label className="field">
          <span>Buscar</span>
          <input
            className="input"
            value={filters.query}
            placeholder="resumir papers, PROA, antibiograma..."
            onChange={(event) => patchFilter("query", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Categoría</span>
          <select className="select" value={filters.category} onChange={(event) => patchFilter("category", event.target.value)}>
            <option value="">Todas</option>
            {categoryOptions.map((category) => (
              <option value={category} key={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Herramienta</span>
          <select className="select" value={filters.tool} onChange={(event) => patchFilter("tool", event.target.value)}>
            <option value="">Todas</option>
            {toolOptions.map((tool) => (
              <option value={tool} key={tool}>
                {tool}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Idioma</span>
          <select className="select" value={filters.language} onChange={(event) => patchFilter("language", event.target.value)}>
            <option value="">Todos</option>
            {languages.map((language) => (
              <option value={language} key={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Nivel</span>
          <select
            className="select"
            value={filters.difficulty}
            onChange={(event) => patchFilter("difficulty", event.target.value as Difficulty | "todas")}
          >
            <option value="todas">Todos</option>
            <option value="principiante">Principiante</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </label>
        <button className="button primary" type="button" onClick={runSearch}>
          <Search size={17} /> Buscar
        </button>
      </div>
      <div className="section-head">
        <div className="badge-row">
          <span className="badge">{results.length} resultados</span>
          {filters.author ? <span className="badge teal">Autor: {filters.author}</span> : null}
        </div>
        <select
          className="select"
          style={{ maxWidth: 230 }}
          value={filters.sort}
          onChange={(event) => patchFilter("sort", event.target.value as PromptFilters["sort"])}
        >
          <option value="recientes">Más recientes</option>
          <option value="votados">Más votados</option>
          <option value="guardados">Más guardados</option>
          <option value="copiados">Más copiados</option>
          <option value="calidad">Mayor calidad GIANT</option>
        </select>
      </div>
      {results.length ? (
        <div className="prompt-grid">
          {results.map((prompt) => (
            <PromptCard prompt={prompt} key={prompt.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">No hay prompts con esos filtros.</div>
      )}
    </section>
  );
}
