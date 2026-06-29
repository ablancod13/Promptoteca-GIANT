"use server";

import { revalidatePath } from "next/cache";
import { AI_MODELS, INITIAL_CATEGORIES, MODELS_BY_TOOL, RECOMMENDED_TOOLS } from "@/lib/constants";
import { slugify } from "@/lib/prompt-utils";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PromptTool } from "@/lib/types";

export type TaxonomyKind = "categories" | "tools" | "models";

export interface TaxonomyItem {
  id: string;
  name: string;
  toolName?: string;
}

export interface TaxonomyState {
  categories: TaxonomyItem[];
  tools: TaxonomyItem[];
  models: TaxonomyItem[];
}

type ActionResult = { ok: true; message: string; state?: TaxonomyState } | { ok: false; message: string };

export async function listTaxonomyAction(): Promise<TaxonomyState> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return fallbackTaxonomyState();

  const [categories, tools, models] = await Promise.all([
    supabase.from("categories").select("id,name").eq("status", "active").order("name"),
    supabase.from("prompt_tool_options").select("id,name").eq("status", "active").order("name"),
    supabase.from("ai_model_options").select("id,name,tool_name").eq("status", "active").order("name")
  ]);

  return {
    categories: rowsOrFallback(categories.data, INITIAL_CATEGORIES),
    tools: rowsOrFallback(tools.data, RECOMMENDED_TOOLS),
    models: modelRowsOrFallback(models.data)
  };
}

export async function addTaxonomyItemAction(kind: TaxonomyKind, name: string, toolName?: string): Promise<ActionResult> {
  const context = await getModerationContext();
  if (!context.ok) return { ok: false, message: context.message };

  const cleanName = name.trim().replace(/\s+/g, " ");
  if (!cleanName) return { ok: false, message: "Escribe un nombre." };

  const { supabase, userId } = context;
  const result =
    kind === "categories"
      ? await upsertCategoryOption(supabase, cleanName, userId)
      : kind === "models"
        ? await supabase
            .from("ai_model_options")
            .upsert({ name: cleanName, tool_name: toolName?.trim() || null, status: "active", created_by: userId }, { onConflict: "name" })
        : await supabase.from("prompt_tool_options").upsert({ name: cleanName, status: "active", created_by: userId }, { onConflict: "name" });

  const { error } = result;
  if (error) return { ok: false, message: "No se pudo añadir la opción." };

  revalidateTaxonomyPaths();
  return { ok: true, message: "Opción añadida.", state: await listTaxonomyAction() };
}

export async function deactivateTaxonomyItemAction(kind: TaxonomyKind, id: string): Promise<ActionResult> {
  const context = await getModerationContext();
  if (!context.ok) return { ok: false, message: context.message };

  const { error } = await context.supabase.from(tableForKind(kind)).update({ status: "inactive" }).eq("id", id);
  if (error) return { ok: false, message: "No se pudo retirar la opción." };

  revalidateTaxonomyPaths();
  return { ok: true, message: "Opción retirada.", state: await listTaxonomyAction() };
}

async function getModerationContext() {
  const server = await createSupabaseServerClient();
  const supabase = createSupabaseAdminClient();
  if (!server || !supabase) return { ok: false as const, message: "Supabase no está configurado." };

  const { data } = await server.auth.getUser();
  if (!data.user) return { ok: false as const, message: "Inicia sesión." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role,account_status")
    .eq("id", data.user.id)
    .single();

  const role = String(profile?.platform_role ?? "");
  const active = profile?.account_status === "active";
  if (!active || !["moderator", "admin", "developer"].includes(role)) {
    return { ok: false as const, message: "No tienes permisos de moderación." };
  }

  return { ok: true as const, supabase, userId: data.user.id };
}

function tableForKind(kind: TaxonomyKind) {
  if (kind === "categories") return "categories";
  if (kind === "tools") return "prompt_tool_options";
  return "ai_model_options";
}

function revalidateTaxonomyPaths() {
  revalidatePath("/moderacion");
  revalidatePath("/prompts");
  revalidatePath("/subir");
}

async function upsertCategoryOption(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  cleanName: string,
  userId: string
) {
  const slug = slugify(cleanName) || "categoria";
  const { data: existingByName } = await supabase.from("categories").select("id").eq("name", cleanName).maybeSingle();
  if (existingByName) {
    return supabase.from("categories").update({ status: "active", approved_by: userId }).eq("id", existingByName.id);
  }

  const { data: existingBySlug } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (existingBySlug) {
    return supabase.from("categories").update({ name: cleanName, status: "active", approved_by: userId }).eq("id", existingBySlug.id);
  }

  return supabase.from("categories").insert({
    name: cleanName,
    slug,
    status: "active",
    created_by: userId,
    approved_by: userId
  });
}

function fallbackTaxonomyState(): TaxonomyState {
  return {
    categories: INITIAL_CATEGORIES.map((name) => ({ id: name, name })).sort(sortByName),
    tools: RECOMMENDED_TOOLS.map((name) => ({ id: name, name })).sort(sortByName),
    models: fallbackModels()
  };
}

function rowsOrFallback(rows: Array<{ id: string; name: string }> | null, fallback: readonly string[]) {
  const values = rows?.map((row) => ({ id: String(row.id), name: String(row.name) })).filter((row) => row.name) ?? [];
  return (values.length ? values : fallback.map((name) => ({ id: name, name }))).sort(sortByName);
}

function modelRowsOrFallback(rows: Array<{ id: string; name: string; tool_name: string | null }> | null) {
  const values =
    rows?.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      toolName: row.tool_name ? String(row.tool_name) : undefined
    })) ?? [];
  return (values.length ? values : fallbackModels()).sort(sortByName);
}

function fallbackModels() {
  return AI_MODELS.map((name) => {
    const toolName = (Object.keys(MODELS_BY_TOOL) as PromptTool[]).find((tool) => MODELS_BY_TOOL[tool].includes(name));
    return { id: name, name, toolName };
  });
}

function sortByName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, "es");
}
