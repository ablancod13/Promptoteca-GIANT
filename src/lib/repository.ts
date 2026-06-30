import { AI_MODELS, INITIAL_CATEGORIES, MODELS_BY_TOOL, RECOMMENDED_TOOLS } from "@/lib/constants";
import { applyPromptFilters, detectVariables, normalizeSearchText } from "@/lib/prompt-utils";
import { seedPrompts } from "@/lib/seed-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Difficulty, Prompt, PromptFilters, PromptTool, PromptVariable, ReviewStatus, VariableFieldType } from "@/lib/types";

type Row = Record<string, any>;

export interface SubmissionModelOption {
  name: string;
  toolName?: string;
}

export async function listPrompts(filters?: PromptFilters): Promise<Prompt[]> {
  const remotePrompts = await listSupabasePrompts();
  const prompts = remotePrompts ?? seedPrompts;
  return applyPromptFilters(prompts, filters);
}

export async function getPromptBySlug(slug: string): Promise<Prompt | null> {
  const remotePrompts = await listSupabasePrompts();
  if (remotePrompts) return remotePrompts.find((prompt) => prompt.slug === slug) ?? null;
  return seedPrompts.find((prompt) => prompt.slug === slug) ?? null;
}

export async function getPromptsByCategory(category: string): Promise<Prompt[]> {
  return applyPromptFilters(await listPrompts(), { category, sort: "recientes" });
}

export async function listCategoryNames(): Promise<string[]> {
  const remote = await listSupabaseCategoryNames();
  return (remote.length ? remote : [...INITIAL_CATEGORIES]).sort((a, b) => a.localeCompare(b, "es"));
}

export async function listPopularTags(limit = 24): Promise<string[]> {
  const prompts = await listPrompts();
  const counts = new Map<string, number>();

  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      const clean = tag.trim();
      if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1);
    }
  }

  return Array.from(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, limit)
    .map(([tag]) => tag);
}

export async function listSubmissionOptions(): Promise<{
  categories: string[];
  tools: string[];
  models: string[];
  modelOptions: SubmissionModelOption[];
}> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    const modelOptions = fallbackModelOptions();
    return {
      categories: [...INITIAL_CATEGORIES].sort((a, b) => a.localeCompare(b, "es")),
      tools: [...RECOMMENDED_TOOLS].sort((a, b) => a.localeCompare(b, "es")),
      models: modelOptions.map((model) => model.name),
      modelOptions
    };
  }

  const [categories, tools, models] = await Promise.all([
    supabase.from("categories").select("name").eq("status", "active").order("name"),
    supabase.from("prompt_tool_options").select("name").eq("status", "active").order("name"),
    supabase.from("ai_model_options").select("name,tool_name").eq("status", "active").order("name")
  ]);

  const modelOptions = modelOptionsOrFallback(models.data);

  return {
    categories: valuesOrFallback(categories.data, INITIAL_CATEGORIES),
    tools: valuesOrFallback(tools.data, RECOMMENDED_TOOLS),
    models: modelOptions.map((model) => model.name),
    modelOptions
  };
}

export async function getCategorySummary(): Promise<Array<{ name: string; count: number }>> {
  const [prompts, categoryNames] = await Promise.all([listPrompts(), listCategoryNames()]);
  const counts = new Map(categoryNames.map((name) => [name, 0]));

  for (const prompt of prompts) {
    counts.set(prompt.category, (counts.get(prompt.category) ?? 0) + 1);
    for (const category of prompt.secondaryCategories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([name, count]) => ({ name, count }))
    .filter((category) => category.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function getHomeStats() {
  const [prompts, platformMetrics, homeSettings] = await Promise.all([
    listPrompts(),
    getPlatformMetrics(),
    getHomeMetricSettings()
  ]);
  const monthKey = new Date().toISOString().slice(0, 7);
  const categoryCounts = new Map<string, number>();

  for (const prompt of prompts) {
    categoryCounts.set(prompt.category, (categoryCounts.get(prompt.category) ?? 0) + 1);
  }

  const fallback = prompts[0] ?? seedPrompts[0];

  return {
    totalPrompts: prompts.length,
    registeredUsers: platformMetrics.registeredUsers,
    showRegisteredUsersMetric: homeSettings.showRegisteredUsers,
    publishedThisMonth: prompts.filter((prompt) => prompt.publishedAt.startsWith(monthKey)).length,
    pendingReview: prompts.filter((prompt) => prompt.reviewStatus === "pending").length,
    validatedByGiant: prompts.filter((prompt) => prompt.validatedByGiant).length,
    totalCopies: prompts.reduce((sum, prompt) => sum + prompt.copies, 0),
    totalFavorites: platformMetrics.favoritesCount ?? prompts.reduce((sum, prompt) => sum + prompt.favorites, 0),
    customVersions: prompts.reduce((sum, prompt) => sum + prompt.templateUses, 0),
    topCategory: Array.from(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Lectura critica",
    mostSaved: [...prompts].sort((a, b) => b.favorites - a.favorites)[0] ?? fallback,
    mostCopied: [...prompts].sort((a, b) => b.copies - a.copies)[0] ?? fallback,
    mostLiked: [...prompts].sort((a, b) => b.likes - a.likes)[0] ?? fallback
  };
}

export async function getRankings() {
  const prompts = await listPrompts();
  return {
    weekly: [...prompts].sort((a, b) => b.likes - a.likes).slice(0, 5),
    monthly: [...prompts].sort((a, b) => b.copies + b.favorites - (a.copies + a.favorites)).slice(0, 5),
    validated: prompts.filter((prompt) => prompt.validatedByGiant).slice(0, 5),
    microbiology: prompts
      .filter((prompt) => categoryMatches(prompt, "Microbiologia clinica"))
      .sort((a, b) => b.likes - a.likes),
    infectiousDiseases: prompts
      .filter((prompt) => categoryMatches(prompt, "Enfermedades infecciosas"))
      .sort((a, b) => b.likes - a.likes)
  };
}

async function listSupabasePrompts(): Promise<Prompt[] | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return null;

  const { data: promptRows, error } = await supabase.from("prompts").select("*").order("created_at", { ascending: false });
  if (error) return [];
  if (!promptRows?.length) return [];

  const promptIds = promptRows.map((row) => row.id as string);
  const authorIds = promptRows.map((row) => row.author_id).filter(Boolean) as string[];

  const [categoriesResult, variablesResult, categoryLinksResult, profilesResult] = await Promise.all([
    supabase.from("categories").select("id,name"),
    supabase.from("prompt_variables").select("*").in("prompt_id", promptIds).order("order_index"),
    supabase.from("prompt_categories").select("*").in("prompt_id", promptIds),
    authorIds.length ? supabase.from("profiles").select("*").in("id", [...new Set(authorIds)]) : Promise.resolve({ data: [] as Row[] })
  ]);

  if (categoriesResult.error) return [];

  const categoriesById = new Map((categoriesResult.data ?? []).map((row) => [String(row.id), String(row.name)]));
  const variablesByPrompt = groupBy(variablesResult.data ?? [], "prompt_id");
  const linksByPrompt = groupBy(categoryLinksResult.data ?? [], "prompt_id");
  const profilesById = new Map((profilesResult.data ?? []).map((row) => [String(row.id), row as Row]));

  return promptRows.map((row) =>
    mapPromptRow(row as Row, {
      categoriesById,
      variables: variablesByPrompt.get(String(row.id)) ?? [],
      categoryLinks: linksByPrompt.get(String(row.id)) ?? [],
      author: row.author_id ? profilesById.get(String(row.author_id)) : undefined
    })
  );
}

async function listSupabaseCategoryNames() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("categories").select("name").eq("status", "active").order("name");
  if (error || !data?.length) return [];
  return data.map((row) => String(row.name));
}

function mapPromptRow(
  row: Row,
  context: {
    categoriesById: Map<string, string>;
    variables: Row[];
    categoryLinks: Row[];
    author?: Row;
  }
): Prompt {
  const category = context.categoriesById.get(String(row.primary_category_id)) ?? row.proposed_category ?? "Sin categoria";
  const secondaryCategories = context.categoryLinks
    .filter((link) => !link.is_primary)
    .map((link) => context.categoriesById.get(String(link.category_id)))
    .filter((value): value is string => Boolean(value));

  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: String(row.summary),
    content: String(row.content),
    objective: String(row.objective ?? ""),
    context: String(row.context ?? ""),
    author: {
      id: String(row.author_id ?? row.author_display_name ?? "equipo-giant"),
      displayName: String(row.author_display_name ?? context.author?.display_name ?? "Equipo GIANT"),
      role: String(context.author?.professional_role ?? "GIANT-SEIMC"),
      country: String(context.author?.country ?? "España"),
      institution: context.author?.institution ? String(context.author.institution) : "GIANT-SEIMC",
      level: Number(context.author?.level ?? 1)
    },
    category,
    secondaryCategories,
    tools: normalizeTools(row.recommended_tools),
    recommendedModel: row.recommended_model ? String(row.recommended_model) : undefined,
    intelligenceLevel: row.intelligence_level ? String(row.intelligence_level) : undefined,
    language: String(row.language),
    bestLanguage: String(row.best_language ?? row.language),
    difficulty: String(row.difficulty ?? "principiante") as Difficulty,
    tags: normalizeStringArray(row.tags),
    reviewStatus: String(row.review_status ?? "pending") as ReviewStatus,
    experimental: Boolean(row.experimental),
    validatedByGiant: Boolean(row.validated_by_giant),
    giantQualityScore: row.giant_quality_score ? Number(row.giant_quality_score) : undefined,
    likes: Number(row.likes_count ?? 0),
    favorites: Number(row.favorites_count ?? 0),
    copies: Number(row.copies_count ?? 0),
    templateUses: Number(row.template_uses_count ?? 0),
    timeSavedMinutes: Number(row.time_saved_minutes ?? 0),
    publishedAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    version: Number(row.version_current ?? 1),
    variables: context.variables.length ? context.variables.map(mapVariableRow) : detectVariables(String(row.id), String(row.content)),
    limitations: String(row.limitations ?? ""),
    misuseRisks: String(row.misuse_risks ?? ""),
    references: normalizeStringArray(row.source_references),
    license: "CC BY 4.0"
  };
}

function mapVariableRow(row: Row): PromptVariable {
  return {
    id: String(row.id),
    promptId: String(row.prompt_id),
    name: String(row.name),
    token: String(row.token),
    type: String(row.field_type ?? "text") as VariableFieldType,
    options: normalizeStringArray(row.options),
    required: row.required !== false,
    helpText: row.help_text ? String(row.help_text) : undefined,
    defaultValue: row.default_value ? String(row.default_value) : undefined,
    order: Number(row.order_index ?? 0)
  };
}

function normalizeTools(value: unknown): PromptTool[] {
  return normalizeStringArray(value) as PromptTool[];
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function groupBy(rows: Row[], field: string) {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const key = String(row[field]);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

function valuesOrFallback<T extends readonly string[] | string[]>(rows: Array<{ name: string }> | null, fallback: T): string[] {
  const values = rows?.map((row) => String(row.name)).filter(Boolean) ?? [];
  return (values.length ? values : [...fallback]).sort((a, b) => a.localeCompare(b, "es"));
}

async function getPlatformMetrics() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { registeredUsers: 0, favoritesCount: null as number | null };

  const [profiles, favorites] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("favorites").select("id", { count: "exact", head: true })
  ]);

  return {
    registeredUsers: profiles.count ?? 0,
    favoritesCount: favorites.count ?? null
  };
}

export async function getHomeMetricSettings() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { showRegisteredUsers: true };

  const { data } = await supabase.from("app_settings").select("value").eq("key", "home_metrics").maybeSingle();
  const value = data?.value as { showRegisteredUsers?: boolean } | null;
  return { showRegisteredUsers: value?.showRegisteredUsers !== false };
}

function modelOptionsOrFallback(rows: Array<{ name: string; tool_name?: string | null }> | null): SubmissionModelOption[] {
  const values =
    rows
      ?.map((row) => ({
        name: String(row.name),
        toolName: row.tool_name ? String(row.tool_name) : undefined
      }))
      .filter((row) => row.name) ?? [];

  return (values.length ? values : fallbackModelOptions()).sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function fallbackModelOptions(): SubmissionModelOption[] {
  return AI_MODELS.map((name) => {
    const toolName = (Object.keys(MODELS_BY_TOOL) as PromptTool[]).find((tool) => MODELS_BY_TOOL[tool].includes(name));
    return { name, toolName };
  });
}

function categoryMatches(prompt: Prompt, expected: string) {
  const normalized = normalizeSearchText(expected);
  return [prompt.category, ...prompt.secondaryCategories].some((category) => normalizeSearchText(category) === normalized);
}
