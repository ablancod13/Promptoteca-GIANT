"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createEmbedding } from "@/lib/openai/embeddings";
import { LEVELS, POINTS_BY_ACTION } from "@/lib/constants";
import { detectVariables, slugify } from "@/lib/prompt-utils";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LocalUser } from "@/lib/local-user";
import type { Difficulty, PlatformRole, PromptTool } from "@/lib/types";

export interface SubmitPromptPayload {
  title: string;
  summary: string;
  content: string;
  category: string;
  tools: string[];
  language: string;
  difficulty: Difficulty;
  tags: string[];
  recommendedModel: string;
  intelligenceLevel: string;
  limitations: string;
  misuseRisks: string;
  experimental: boolean;
  noPatientDataConfirmed: boolean;
  licenseAccepted: boolean;
}

type SubmitPromptResult =
  | { ok: true; message: string; slug: string; user: LocalUser | null }
  | { ok: false; message: string };

export async function submitPromptAction(payload: SubmitPromptPayload): Promise<SubmitPromptResult> {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase || !admin) {
    return { ok: false, message: "Supabase no esta configurado. Revisa las variables de entorno." };
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Inicia sesion para compartir prompts." };

  const validationMessage = validatePayload(payload);
  if (validationMessage) return { ok: false, message: validationMessage };

  const { data: profile, error: profileError } = await admin.from("profiles").select("*").eq("id", authData.user.id).single();
  if (profileError || !profile) return { ok: false, message: "No se encontro tu perfil." };

  const category = await ensureCategory(admin, payload.category, authData.user.id);
  if (!category.id) return { ok: false, message: "La categoría seleccionada no está disponible." };

  const slug = await createUniqueSlug(admin, slugify(payload.title) || "prompt");
  const promptInsert = {
    slug,
    title: payload.title.trim(),
    summary: payload.summary.trim(),
    content: payload.content.trim(),
    objective: "",
    context: "",
    author_id: authData.user.id,
    author_display_name: String(profile.display_name ?? "Usuario GIANT"),
    primary_category_id: category.id,
    recommended_tools: payload.tools,
    recommended_model: payload.recommendedModel || null,
    intelligence_level: payload.intelligenceLevel || null,
    language: payload.language,
    best_language: payload.language,
    difficulty: normalizeDifficulty(payload.difficulty),
    tags: normalizeTags(payload.tags),
    review_status: "pending",
    experimental: payload.experimental,
    validated_by_giant: false,
    no_patient_data_confirmed: true,
    license: "CC BY 4.0",
    limitations: payload.limitations.trim(),
    misuse_risks: payload.misuseRisks.trim(),
    source_references: []
  };

  const { data: prompt, error: promptError } = await admin.from("prompts").insert(promptInsert).select("id,slug").single();
  if (promptError || !prompt) return { ok: false, message: translateInsertError(promptError?.message ?? "No se pudo guardar el prompt.") };

  const variables = detectVariables(prompt.id, payload.content);
  const writes = [
    admin.from("prompt_categories").insert({
      prompt_id: prompt.id,
      category_id: category.id,
      is_primary: true
    }),
    admin.from("prompt_versions").insert({
      prompt_id: prompt.id,
      version_number: 1,
      content: payload.content.trim(),
      summary: payload.summary.trim(),
      created_by: authData.user.id,
      change_reason: "Creacion inicial"
    })
  ];

  if (variables.length) {
    writes.push(
      admin.from("prompt_variables").insert(
        variables.map((variable) => ({
          prompt_id: prompt.id,
          name: variable.name,
          token: variable.token,
          field_type: variable.type,
          options: variable.options,
          required: variable.required,
          help_text: variable.helpText ?? null,
          default_value: variable.defaultValue ?? null,
          order_index: variable.order
        }))
      )
    );
  }

  const writeResults = await Promise.all(writes);
  const writeError = writeResults.find((result) => result.error)?.error;
  if (writeError) return { ok: false, message: "El prompt se guardo, pero faltan metadatos. Revisa Supabase." };

  await Promise.allSettled([
    awardPromptSubmissionPoints(admin, authData.user.id, prompt.id, Number(profile.points ?? 0)),
    generatePromptEmbedding(admin, prompt.id, {
      title: payload.title,
      summary: payload.summary,
      content: payload.content,
      category: payload.category,
      tags: payload.tags,
      tools: payload.tools,
      language: payload.language
    })
  ]);

  const nextUser = await getLocalUserFromProfile(admin, authData.user.id);

  revalidatePath("/");
  revalidatePath("/prompts");
  revalidatePath(`/prompts/${prompt.slug}`);
  revalidatePath("/subir");

  return {
    ok: true,
    message: "Prompt enviado. Puedes compartir otro cuando quieras.",
    slug: prompt.slug,
    user: nextUser
  };
}

function validatePayload(payload: SubmitPromptPayload) {
  if (!payload.title.trim()) return "El titulo es obligatorio.";
  if (!payload.summary.trim()) return "El resumen es obligatorio.";
  if (!payload.content.trim()) return "El texto completo del prompt es obligatorio.";
  if (!payload.category.trim()) return "Selecciona una categoria.";
  if (!payload.tools.length) return "Selecciona al menos una herramienta recomendada.";
  if (!payload.language.trim()) return "Selecciona o especifica el idioma.";
  if (!payload.noPatientDataConfirmed) return "Confirma que no contiene datos identificables.";
  if (!payload.licenseAccepted) return "Debes aceptar la licencia CC BY 4.0.";
  return "";
}

function normalizeDifficulty(value: string): Difficulty {
  return ["principiante", "intermedio", "avanzado"].includes(value) ? (value as Difficulty) : "principiante";
}

function normalizeTags(tags: string[]) {
  return [
    ...new Set(
      tags
        .map((tag) => tag.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .slice(0, 8)
    )
  ];
}

async function createUniqueSlug(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, baseSlug: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data } = await admin.from("prompts").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  return `${baseSlug}-${Date.now()}`;
}

async function ensureCategory(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, name: string, userId: string) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const slug = slugify(cleanName) || "categoria";

  const { data: existingByName } = await admin
    .from("categories")
    .select("id,name")
    .eq("name", cleanName)
    .maybeSingle();
  if (existingByName) return existingByName;

  const { data: existingBySlug } = await admin
    .from("categories")
    .select("id,name")
    .eq("slug", slug)
    .maybeSingle();
  if (existingBySlug) return existingBySlug;

  const { data, error } = await admin
    .from("categories")
    .insert({
      name: cleanName,
      slug,
      status: "active",
      created_by: userId,
      approved_by: userId
    })
    .select("id,name")
    .single();

  if (!error && data) return data;

  const { data: fallback } = await admin.from("categories").select("id,name").eq("slug", slug).maybeSingle();
  return fallback ?? { id: "", name: cleanName };
}

async function awardPromptSubmissionPoints(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  promptId: string,
  currentPoints: number
) {
  const points = POINTS_BY_ACTION.prompt_submitted;
  const nextPoints = Math.max(0, currentPoints + points);
  await admin.from("points_ledger").insert({
    user_id: userId,
    action: "prompt_submitted",
    points,
    prompt_id: promptId,
    origin: "system",
    idempotency_key: `prompt_submitted:${promptId}`
  });
  await admin.from("profiles").update({ points: nextPoints, level: levelForPoints(nextPoints) }).eq("id", userId);
}

async function generatePromptEmbedding(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  promptId: string,
  source: { title: string; summary: string; content: string; category: string; tags: string[]; tools: string[]; language: string }
) {
  const text = [source.title, source.summary, source.category, source.language, source.tags.join(", "), source.tools.join(", "), source.content].join("\n");
  const embedding = await createEmbedding(text);
  if (!embedding?.embedding.length) return;

  await admin.from("prompt_embeddings").upsert({
    prompt_id: promptId,
    embedding: embedding.embedding,
    model: embedding.model,
    source_hash: createHash("sha256").update(text).digest("hex")
  });
}

async function getLocalUserFromProfile(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userId: string): Promise<LocalUser | null> {
  const { data } = await admin.from("profiles").select("*").eq("id", userId).single();
  if (!data) return null;

  return {
    id: String(data.id ?? ""),
    email: String(data.email ?? ""),
    name: String(data.first_name ?? "Usuario"),
    surname: String(data.last_name ?? ""),
    displayName: String(data.display_name ?? data.first_name ?? "Usuario GIANT"),
    role: String(data.professional_role ?? "registered"),
    platformRole: String(data.platform_role ?? "registered") as PlatformRole,
    xp: Number(data.points ?? 0),
    createdAt: String(data.created_at ?? new Date().toISOString()),
    country: String(data.country ?? ""),
    region: String(data.region ?? ""),
    city: data.city ? String(data.city) : "",
    birthYear: data.birth_year ? String(data.birth_year) : "",
    roleDetail: data.role_detail ? String(data.role_detail) : "",
    specializationYear: data.specialization_year ? String(data.specialization_year) : "",
    institution: data.institution ? String(data.institution) : "",
    licenseNumber: data.license_number ? String(data.license_number) : "",
    seimcMember: typeof data.seimc_member === "boolean" ? (data.seimc_member ? "si" : "no") : "",
    institutionType: data.institution_type ? String(data.institution_type) : "",
    primaryActivityArea: data.primary_activity_area ? String(data.primary_activity_area) : "",
    professionalExperienceYears: data.professional_experience_years ? String(data.professional_experience_years) : "",
    aiFrequency: String(data.ai_frequency ?? ""),
    aiProfessionalUse: String(data.ai_professional_use ?? ""),
    aiLevel: String(data.ai_experience_level ?? ""),
    aiTools: Array.isArray(data.ai_tools) ? data.ai_tools.map(String) : [],
    accountStatus: String(data.account_status ?? "active")
  };
}

function levelForPoints(points: number) {
  return [...LEVELS].reverse().find((level) => points >= level.minXp)?.level ?? 1;
}

function translateInsertError(message: string) {
  if (message.includes("limitations") || message.includes("misuse_risks")) {
    return "Falta aplicar la migracion 002 en Supabase antes de publicar prompts.";
  }
  if (message.toLowerCase().includes("duplicate")) return "Ya existe un prompt con ese titulo. Prueba con un titulo mas especifico.";
  return message;
}
