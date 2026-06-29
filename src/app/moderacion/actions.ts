"use server";

import { revalidatePath } from "next/cache";
import { LEVELS, POINTS_BY_ACTION } from "@/lib/constants";
import { slugify } from "@/lib/prompt-utils";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReviewStatus } from "@/lib/types";

export interface ModerationReport {
  id: string;
  promptId: string;
  promptSlug: string;
  promptTitle: string;
  createdAt: string;
  reason: string;
  details: string;
  status: string;
}

export interface ModerationPromptUpdatePayload {
  promptId: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  experimental: boolean;
  validatedByGiant: boolean;
  approve: boolean;
}

type ModerationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function canModerateAction(): Promise<boolean> {
  const context = await getModerationContext();
  return context.ok;
}

export async function listOpenReportsAction(): Promise<ModerationReport[]> {
  const context = await getModerationContext();
  if (!context.ok) return [];

  const { data } = await context.admin
    .from("reports")
    .select("id,prompt_id,reason,details,status,created_at,prompts(slug,title)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    promptId: String(row.prompt_id),
    promptSlug: String(row.prompts?.slug ?? ""),
    promptTitle: String(row.prompts?.title ?? "Prompt reportado"),
    createdAt: String(row.created_at),
    reason: String(row.reason ?? "revisión solicitada"),
    details: String(row.details ?? ""),
    status: String(row.status ?? "open")
  }));
}

export async function moderatePromptStatusAction(promptId: string, status: ReviewStatus): Promise<ModerationResult> {
  const context = await getModerationContext();
  if (!context.ok) return context;

  const { data: prompt } = await context.admin.from("prompts").select("slug,review_status,author_id").eq("id", promptId).single();
  if (!prompt) return { ok: false, message: "No se encontro el prompt." };

  await context.admin.from("prompts").update({ review_status: status }).eq("id", promptId);
  await logModerationAction(context.admin, promptId, context.userId, `status:${status}`, prompt.review_status, status);
  if (status === "approved" && prompt.author_id) {
    await awardPointsOnce(
      context.admin,
      String(prompt.author_id),
      "prompt_approved",
      POINTS_BY_ACTION.prompt_approved,
      promptId,
      `prompt-approved:${promptId}`
    );
  }

  revalidateModerationPaths(String(prompt.slug));
  return { ok: true, message: status === "approved" ? "Prompt aprobado." : status === "hidden" ? "Prompt ocultado." : "Estado actualizado." };
}

export async function deletePromptAction(promptId: string): Promise<ModerationResult> {
  const context = await getModerationContext();
  if (!context.ok) return context;

  const { data: prompt } = await context.admin.from("prompts").select("slug,review_status").eq("id", promptId).single();
  if (!prompt) return { ok: false, message: "No se encontro el prompt." };

  await logModerationAction(context.admin, promptId, context.userId, "delete", prompt.review_status, "rejected");
  await context.admin.from("prompts").delete().eq("id", promptId);

  revalidateModerationPaths(String(prompt.slug));
  return { ok: true, message: "Prompt eliminado." };
}

export async function togglePromptExperimentalAction(promptId: string): Promise<ModerationResult> {
  const context = await getModerationContext();
  if (!context.ok) return context;

  const { data: prompt } = await context.admin.from("prompts").select("slug,experimental").eq("id", promptId).single();
  if (!prompt) return { ok: false, message: "No se encontro el prompt." };

  await context.admin.from("prompts").update({ experimental: !prompt.experimental }).eq("id", promptId);
  await logModerationAction(context.admin, promptId, context.userId, "toggle_experimental", null, null);
  revalidateModerationPaths(String(prompt.slug));
  return { ok: true, message: prompt.experimental ? "Marcado como no experimental." : "Marcado como experimental." };
}

export async function togglePromptValidatedAction(promptId: string): Promise<ModerationResult> {
  const context = await getModerationContext();
  if (!context.ok) return context;

  const { data: prompt } = await context.admin.from("prompts").select("slug,validated_by_giant,author_id").eq("id", promptId).single();
  if (!prompt) return { ok: false, message: "No se encontro el prompt." };

  const next = !prompt.validated_by_giant;
  await context.admin.from("prompts").update({ validated_by_giant: next }).eq("id", promptId);
  await logModerationAction(context.admin, promptId, context.userId, "toggle_validated_giant", null, null);
  if (next && prompt.author_id) {
    await awardPointsOnce(
      context.admin,
      String(prompt.author_id),
      "prompt_validated_giant",
      POINTS_BY_ACTION.prompt_validated_giant,
      promptId,
      `prompt-validated:${promptId}`
    );
  }

  revalidateModerationPaths(String(prompt.slug));
  return { ok: true, message: next ? "Validado por GIANT." : "Validación GIANT retirada." };
}

export async function resolveReportAction(reportId: string): Promise<ModerationResult> {
  const context = await getModerationContext();
  if (!context.ok) return context;

  await context.admin
    .from("reports")
    .update({
      status: "resolved",
      moderator_id: context.userId,
      resolved_at: new Date().toISOString()
    })
    .eq("id", reportId);

  revalidatePath("/moderacion");
  return { ok: true, message: "Reporte marcado como revisado." };
}

export async function saveModeratedPromptAction(payload: ModerationPromptUpdatePayload): Promise<ModerationResult> {
  const context = await getModerationContext();
  if (!context.ok) return context;

  const { data: current } = await context.admin
    .from("prompts")
    .select("slug,review_status,version_current,primary_category_id")
    .eq("id", payload.promptId)
    .single();
  if (!current) return { ok: false, message: "No se encontro el prompt." };

  const category = await ensureCategory(context.admin, payload.category, context.userId);
  const nextVersion = Number(current.version_current ?? 1) + 1;
  const nextStatus = payload.approve ? "approved" : String(current.review_status);

  await context.admin
    .from("prompts")
    .update({
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      content: payload.content.trim(),
      primary_category_id: category.id,
      experimental: payload.experimental,
      validated_by_giant: payload.validatedByGiant,
      review_status: nextStatus,
      version_current: nextVersion
    })
    .eq("id", payload.promptId);

  await context.admin.from("prompt_categories").upsert(
    {
      prompt_id: payload.promptId,
      category_id: category.id,
      is_primary: true
    },
    { onConflict: "prompt_id,category_id" }
  );

  await context.admin.from("prompt_versions").insert({
    prompt_id: payload.promptId,
    version_number: nextVersion,
    content: payload.content.trim(),
    summary: payload.summary.trim(),
    created_by: context.userId,
    change_reason: payload.approve ? "Revisión y aprobación de moderación" : "Edición de moderación"
  });

  await logModerationAction(
    context.admin,
    payload.promptId,
    context.userId,
    payload.approve ? "edit_and_approve" : "edit",
    current.review_status,
    nextStatus as ReviewStatus
  );

  revalidateModerationPaths(payload.slug || String(current.slug));
  return { ok: true, message: payload.approve ? "Cambios guardados y prompt aprobado." : "Cambios guardados." };
}

async function getModerationContext() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return { ok: false as const, message: "Supabase no esta configurado." };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false as const, message: "Inicia sesion para moderar." };

  const { data: profile } = await admin
    .from("profiles")
    .select("platform_role,account_status")
    .eq("id", authData.user.id)
    .single();

  if (!profile || profile.account_status !== "active" || !["moderator", "admin", "developer"].includes(String(profile.platform_role))) {
    return { ok: false as const, message: "No tienes permisos de moderacion." };
  }

  return { ok: true as const, admin, userId: authData.user.id };
}

async function ensureCategory(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, name: string, userId: string) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const slug = slugify(cleanName) || "categoria";
  const { data: existingByName } = await admin.from("categories").select("id,name").eq("name", cleanName).maybeSingle();
  if (existingByName) return existingByName;

  const { data: existingBySlug } = await admin.from("categories").select("id,name").eq("slug", slug).maybeSingle();
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

async function logModerationAction(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  promptId: string,
  moderatorId: string,
  action: string,
  previousStatus: ReviewStatus | null,
  nextStatus: ReviewStatus | null
) {
  await admin.from("moderation_actions").insert({
    prompt_id: promptId,
    moderator_id: moderatorId,
    action,
    previous_status: previousStatus,
    next_status: nextStatus,
    notes: null
  });
}

async function awardPointsOnce(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  action: string,
  points: number,
  promptId: string,
  idempotencyKey: string
) {
  const inserted = await admin
    .from("points_ledger")
    .insert({
      user_id: userId,
      action,
      points,
      prompt_id: promptId,
      origin: "system",
      idempotency_key: idempotencyKey
    })
    .select("id")
    .maybeSingle();

  if (inserted.error) return;

  const { data: profile } = await admin.from("profiles").select("points").eq("id", userId).single();
  const nextPoints = Number(profile?.points ?? 0) + points;
  await admin.from("profiles").update({ points: nextPoints, level: levelForPoints(nextPoints) }).eq("id", userId);
}

function levelForPoints(points: number) {
  return [...LEVELS].reverse().find((level) => points >= level.minXp)?.level ?? 1;
}

function revalidateModerationPaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/prompts");
  revalidatePath("/moderacion");
  if (slug) {
    revalidatePath(`/prompts/${slug}`);
    revalidatePath(`/moderacion/prompts/${slug}`);
  }
}
