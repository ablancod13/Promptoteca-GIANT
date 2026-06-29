"use server";

import { revalidatePath } from "next/cache";
import { LEVELS, POINTS_BY_ACTION } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PromptStatsSnapshot {
  likes: number;
  favorites: number;
  copies: number;
  templateUses: number;
}

export interface PromptInteractionState {
  liked: boolean;
  favorited: boolean;
  stats: PromptStatsSnapshot;
}

type InteractionResult =
  | { ok: true; message: string; state: PromptInteractionState }
  | { ok: false; message: string };

export async function getPromptInteractionStateAction(promptId: string): Promise<PromptInteractionState> {
  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();
  const stats = admin ? await getPromptStats(admin, promptId) : emptyStats();

  const { data: authData } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!admin || !authData.user) {
    return { liked: false, favorited: false, stats };
  }

  const [like, favorite] = await Promise.all([
    admin.from("likes").select("id").eq("user_id", authData.user.id).eq("prompt_id", promptId).maybeSingle(),
    admin.from("favorites").select("id").eq("user_id", authData.user.id).eq("prompt_id", promptId).maybeSingle()
  ]);

  return {
    liked: Boolean(like.data),
    favorited: Boolean(favorite.data),
    stats
  };
}

export async function togglePromptLikeAction(promptId: string): Promise<InteractionResult> {
  return togglePromptRelation(promptId, "likes");
}

export async function togglePromptFavoriteAction(promptId: string): Promise<InteractionResult> {
  return togglePromptRelation(promptId, "favorites");
}

export async function registerPromptCopyAction(promptId: string): Promise<InteractionResult> {
  const context = await getActionContext(promptId);
  if (!context.ok) return context;

  const { admin, userId, prompt } = context;
  const nextCopies = Number(prompt.copies_count ?? 0) + 1;
  await admin.from("prompts").update({ copies_count: nextCopies }).eq("id", promptId);
  await admin.from("analytics_events").insert({
    user_id: userId,
    event_type: "copia_prompt",
    prompt_id: promptId,
    metadata: {}
  });
  await awardPointsOnce(admin, userId, "prompt_copied", POINTS_BY_ACTION.first_prompt_copied, promptId, `copy:${userId}:${promptId}`);

  revalidatePromptPaths(prompt.slug);
  return {
    ok: true,
    message: "Prompt copiado.",
    state: await getPromptInteractionStateAction(promptId)
  };
}

export async function registerTemplateUseAction(promptId: string): Promise<InteractionResult> {
  const context = await getActionContext(promptId);
  if (!context.ok) return context;

  const { admin, userId, prompt } = context;
  await admin
    .from("prompts")
    .update({ template_uses_count: Number(prompt.template_uses_count ?? 0) + 1 })
    .eq("id", promptId);
  await admin.from("analytics_events").insert({
    user_id: userId,
    event_type: "uso_plantilla",
    prompt_id: promptId,
    metadata: {}
  });
  await awardPointsOnce(admin, userId, "template_used", 2, promptId, `template:${userId}:${promptId}`);

  revalidatePromptPaths(prompt.slug);
  return {
    ok: true,
    message: "Plantilla abierta.",
    state: await getPromptInteractionStateAction(promptId)
  };
}

export async function updatePromptStatsAction(promptId: string, stats: PromptStatsSnapshot): Promise<InteractionResult> {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return { ok: false, message: "Supabase no esta configurado." };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Inicia sesion para editar estadisticas." };

  const { data: profile } = await admin.from("profiles").select("platform_role").eq("id", authData.user.id).single();
  if (!["admin", "developer"].includes(String(profile?.platform_role ?? ""))) {
    return { ok: false, message: "No tienes permisos para editar estadisticas." };
  }

  const { data: prompt } = await admin.from("prompts").select("slug").eq("id", promptId).single();
  await admin
    .from("prompts")
    .update({
      likes_count: clamp(stats.likes),
      favorites_count: clamp(stats.favorites),
      copies_count: clamp(stats.copies),
      template_uses_count: clamp(stats.templateUses)
    })
    .eq("id", promptId);

  revalidatePromptPaths(String(prompt?.slug ?? ""));
  return {
    ok: true,
    message: "Estadisticas actualizadas.",
    state: await getPromptInteractionStateAction(promptId)
  };
}

async function togglePromptRelation(promptId: string, table: "likes" | "favorites"): Promise<InteractionResult> {
  const context = await getActionContext(promptId);
  if (!context.ok) return context;

  const { admin, userId, prompt } = context;
  const existing = await admin.from(table).select("id").eq("user_id", userId).eq("prompt_id", promptId).maybeSingle();
  const wasPresent = Boolean(existing.data);

  if (wasPresent) {
    await admin.from(table).delete().eq("user_id", userId).eq("prompt_id", promptId);
  } else {
    await admin.from(table).insert({ user_id: userId, prompt_id: promptId });
  }

  const count = await countRows(admin, table, promptId);
  await admin
    .from("prompts")
    .update(table === "likes" ? { likes_count: count } : { favorites_count: count })
    .eq("id", promptId);

  await admin.from("analytics_events").insert({
    user_id: userId,
    event_type: table === "likes" ? "like" : "favorito",
    prompt_id: promptId,
    metadata: { enabled: !wasPresent }
  });

  if (!wasPresent) {
    await awardPointsOnce(
      admin,
      userId,
      table === "likes" ? "like_given" : "favorite_saved",
      table === "likes" ? 1 : POINTS_BY_ACTION.favorite_saved,
      promptId,
      `${table}:${userId}:${promptId}`
    );
  }

  revalidatePromptPaths(prompt.slug);
  return {
    ok: true,
    message: table === "likes" ? (wasPresent ? "Me gusta eliminado." : "Me gusta registrado.") : wasPresent ? "Eliminado de favoritos." : "Guardado en favoritos.",
    state: await getPromptInteractionStateAction(promptId)
  };
}

async function getActionContext(promptId: string) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return { ok: false as const, message: "Supabase no esta configurado." };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false as const, message: "Inicia sesion para usar esta funcion." };

  const { data: prompt } = await admin
    .from("prompts")
    .select("id,slug,likes_count,favorites_count,copies_count,template_uses_count")
    .eq("id", promptId)
    .single();

  if (!prompt) return { ok: false as const, message: "No se encontro el prompt." };

  return { ok: true as const, admin, userId: authData.user.id, prompt };
}

async function getPromptStats(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, promptId: string): Promise<PromptStatsSnapshot> {
  const { data } = await admin
    .from("prompts")
    .select("likes_count,favorites_count,copies_count,template_uses_count")
    .eq("id", promptId)
    .maybeSingle();

  if (!data) return emptyStats();

  return {
    likes: Number(data.likes_count ?? 0),
    favorites: Number(data.favorites_count ?? 0),
    copies: Number(data.copies_count ?? 0),
    templateUses: Number(data.template_uses_count ?? 0)
  };
}

async function countRows(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, table: "likes" | "favorites", promptId: string) {
  const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq("prompt_id", promptId);
  return count ?? 0;
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

function emptyStats(): PromptStatsSnapshot {
  return { likes: 0, favorites: 0, copies: 0, templateUses: 0 };
}

function clamp(value: number) {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

function revalidatePromptPaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/prompts");
  if (slug) revalidatePath(`/prompts/${slug}`);
}
