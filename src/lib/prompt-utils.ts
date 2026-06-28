import type { Prompt, PromptFilters, PromptVariable } from "@/lib/types";

const VARIABLE_PATTERN = /\[([^\[\]\n]{1,80})\]/g;

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function detectVariables(promptId: string, text: string): PromptVariable[] {
  const seen = new Map<string, PromptVariable>();
  let match: RegExpExecArray | null;
  let order = 0;

  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    const name = match[1].trim();
    const key = name.toLowerCase();

    if (!seen.has(key)) {
      seen.set(key, {
        id: `${promptId}-var-${order + 1}`,
        promptId,
        name,
        token: `[${name}]`,
        type: "text",
        options: [],
        required: true,
        order
      });
      order += 1;
    }
  }

  return Array.from(seen.values());
}

export function hydratePromptTemplate(text: string, values: Record<string, string | string[]>): string {
  return text.replace(VARIABLE_PATTERN, (_, rawName: string) => {
    const name = rawName.trim();
    const value = values[name];
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(", ") || `[${name}]`;
    }
    return value?.trim() || `[${name}]`;
  });
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getPromptSearchCorpus(prompt: Prompt): string {
  return [
    prompt.title,
    prompt.summary,
    prompt.content,
    prompt.objective,
    prompt.context,
    prompt.category,
    prompt.secondaryCategories.join(" "),
    prompt.tools.join(" "),
    prompt.language,
    prompt.bestLanguage,
    prompt.tags.join(" "),
    prompt.author.displayName
  ].join(" ");
}

export function scorePromptText(prompt: Prompt, query: string): number {
  const normalizedQuery = normalizeSearchText(query).trim();
  if (!normalizedQuery) return 0;

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const title = normalizeSearchText(prompt.title);
  const summary = normalizeSearchText(prompt.summary);
  const tags = normalizeSearchText(prompt.tags.join(" "));
  const corpus = normalizeSearchText(getPromptSearchCorpus(prompt));

  return terms.reduce((score, term) => {
    if (title.includes(term)) return score + 8;
    if (tags.includes(term)) return score + 6;
    if (summary.includes(term)) return score + 4;
    if (corpus.includes(term)) return score + 1;
    return score;
  }, 0);
}

export function applyPromptFilters(prompts: Prompt[], filters: PromptFilters = {}): Prompt[] {
  const query = filters.query?.trim() ?? "";
  const author = normalizeSearchText(filters.author ?? "").trim();
  const scored = prompts
    .map((prompt) => ({ prompt, score: scorePromptText(prompt, query) }))
    .filter(({ prompt, score }) => {
      if (query && score === 0) return false;
      if (
        author &&
        normalizeSearchText(prompt.author.displayName) !== author &&
        normalizeSearchText(prompt.author.id) !== author
      ) {
        return false;
      }
      if (filters.category && prompt.category !== filters.category && !prompt.secondaryCategories.includes(filters.category)) {
        return false;
      }
      if (filters.tool && !prompt.tools.includes(filters.tool as never)) return false;
      if (filters.language && prompt.language !== filters.language && prompt.bestLanguage !== filters.language) return false;
      if (filters.difficulty && filters.difficulty !== "todas" && prompt.difficulty !== filters.difficulty) return false;
      if (filters.validatedOnly && !prompt.validatedByGiant) return false;
      if (filters.experimentalOnly && !prompt.experimental) return false;
      if (filters.pendingOnly && prompt.reviewStatus !== "pending") return false;
      if (prompt.reviewStatus === "hidden" || prompt.reviewStatus === "archived" || prompt.reviewStatus === "rejected") return false;
      return true;
    });

  return scored
    .sort((a, b) => {
      if (query && a.score !== b.score) return b.score - a.score;
      switch (filters.sort) {
        case "votados":
          return b.prompt.likes - a.prompt.likes;
        case "guardados":
          return b.prompt.favorites - a.prompt.favorites;
        case "copiados":
          return b.prompt.copies - a.prompt.copies;
        case "calidad":
          return (b.prompt.giantQualityScore ?? 0) - (a.prompt.giantQualityScore ?? 0);
        case "recientes":
        default:
          return Date.parse(b.prompt.publishedAt) - Date.parse(a.prompt.publishedAt);
      }
    })
    .map(({ prompt }) => prompt);
}

export function isPromptActionRestricted(action: "copy" | "template" | "favorite" | "like" | "submit" | "note", isRegistered: boolean): boolean {
  if (isRegistered) return false;
  return ["copy", "template", "favorite", "like", "submit", "note"].includes(action);
}
