"use server";

import { revalidatePath } from "next/cache";
import { LEVELS } from "@/lib/constants";
import type { AboutContent } from "@/lib/about-content";
import { getAboutContent } from "@/lib/about-repository";
import { BADGE_RULES, parseBadgeCriterion, type BadgeCriterion, type BadgeRuleKey } from "@/lib/badge-rules";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface DeveloperUser {
  id: string;
  displayName: string;
  email: string;
  professionalRole: string;
  platformRole: string;
  status: string;
  xp: number;
  createdAt: string;
}

export interface DeveloperSettings {
  showRegisteredUsers: boolean;
}

export interface BadgeDefinitionAdmin {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  criterion: BadgeCriterion;
  criterionLabel: string;
  shareable: boolean;
}

export interface SaveBadgePayload {
  id?: string;
  name: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  rule: BadgeRuleKey;
  threshold: number;
  shareable: boolean;
}

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function canDevelopAction(): Promise<boolean> {
  const context = await getDeveloperContext();
  return context.ok;
}

export async function listDeveloperUsersAction(query = ""): Promise<DeveloperUser[]> {
  const context = await getDeveloperContext();
  if (!context.ok) return [];

  const { data, error } = await context.supabase
    .from("profiles")
    .select("id,email,display_name,professional_role,platform_role,account_status,points,created_at")
    .order("created_at", { ascending: false })
    .limit(150);

  if (error || !data) return [];

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  return data
    .map((row) => ({
      id: String(row.id),
      displayName: String(row.display_name ?? "Usuario GIANT"),
      email: String(row.email ?? ""),
      professionalRole: String(row.professional_role ?? ""),
      platformRole: String(row.platform_role ?? "registered"),
      status: String(row.account_status ?? "active"),
      xp: Number(row.points ?? 0),
      createdAt: String(row.created_at ?? "")
    }))
    .filter((user) => {
      if (!normalizedQuery) return true;
      return `${user.displayName} ${user.email} ${user.professionalRole}`.toLocaleLowerCase("es").includes(normalizedQuery);
    });
}

export async function getDeveloperSettingsAction(): Promise<DeveloperSettings> {
  const context = await getDeveloperContext();
  if (!context.ok) return { showRegisteredUsers: true };

  const { data } = await context.supabase.from("app_settings").select("value").eq("key", "home_metrics").maybeSingle();
  const value = data?.value as { showRegisteredUsers?: boolean } | null;
  return { showRegisteredUsers: value?.showRegisteredUsers !== false };
}

export async function updateHomeMetricVisibilityAction(showRegisteredUsers: boolean): Promise<ActionResult> {
  const context = await getDeveloperContext();
  if (!context.ok) return { ok: false, message: context.message };

  const { error } = await context.supabase.from("app_settings").upsert(
    {
      key: "home_metrics",
      value: { showRegisteredUsers },
      updated_by: context.userId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "key" }
  );

  if (error) return { ok: false, message: "No se pudo guardar el ajuste." };

  revalidatePath("/");
  revalidatePath("/desarrollador");
  return { ok: true, message: "Ajuste del home guardado." };
}

export async function listBadgeDefinitionsAction(): Promise<BadgeDefinitionAdmin[]> {
  const context = await getDeveloperContext();
  if (!context.ok) return [];

  const { data, error } = await context.supabase
    .from("badges")
    .select("id,name,description,image_url,image_alt,criterion,shareable")
    .order("name", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const criterion = parseBadgeCriterion(row.criterion);
    return {
      id: String(row.id),
      name: String(row.name ?? ""),
      description: String(row.description ?? ""),
      imageUrl: String(row.image_url ?? ""),
      imageAlt: String(row.image_alt ?? ""),
      criterion,
      criterionLabel: formatCriterionLabel(criterion),
      shareable: row.shareable !== false
    };
  });
}

export async function saveBadgeDefinitionAction(payload: SaveBadgePayload): Promise<ActionResult> {
  const context = await getDeveloperContext();
  if (!context.ok) return { ok: false, message: context.message };

  const name = payload.name.trim().replace(/\s+/g, " ");
  const description = payload.description.trim();
  const rule = BADGE_RULES.some((item) => item.value === payload.rule) ? payload.rule : "prompts_shared";
  const threshold = Math.max(1, Math.floor(Number(payload.threshold || 1)));
  if (!name) return { ok: false, message: "El título del logro es obligatorio." };
  if (!description) return { ok: false, message: "La descripción del logro es obligatoria." };

  const row = {
    name,
    description,
    icon: "award",
    image_url: payload.imageUrl.trim() || null,
    image_alt: payload.imageAlt.trim() || name,
    criterion: JSON.stringify({ rule, threshold }),
    shareable: payload.shareable
  };

  const result = payload.id
    ? await context.supabase.from("badges").update(row).eq("id", payload.id)
    : await context.supabase.from("badges").insert(row);

  if (result.error) {
    const duplicate = result.error.message.toLocaleLowerCase("es").includes("duplicate");
    return { ok: false, message: duplicate ? "Ya existe un logro con ese título." : "No se pudo guardar el logro." };
  }

  revalidatePath("/desarrollador");
  revalidatePath("/perfil");
  return { ok: true, message: "Logro guardado." };
}

export async function deleteBadgeDefinitionAction(id: string): Promise<ActionResult> {
  const context = await getDeveloperContext();
  if (!context.ok) return { ok: false, message: context.message };

  const { error } = await context.supabase.from("badges").delete().eq("id", id);
  if (error) return { ok: false, message: "No se pudo eliminar el logro." };

  revalidatePath("/desarrollador");
  revalidatePath("/perfil");
  return { ok: true, message: "Logro eliminado." };
}

export async function setUserAccountStatusAction(userId: string, status: "active" | "blocked"): Promise<ActionResult> {
  const context = await getDeveloperContext();
  if (!context.ok) return { ok: false, message: context.message };

  if (context.userId === userId && status === "blocked") {
    return { ok: false, message: "No puedes bloquear tu propia cuenta desde aquí." };
  }

  const { error } = await context.supabase.from("profiles").update({ account_status: status }).eq("id", userId);
  if (error) return { ok: false, message: "No se pudo actualizar la cuenta." };

  revalidatePath("/desarrollador");
  return { ok: true, message: status === "active" ? "Cuenta reactivada." : "Cuenta bloqueada." };
}

export async function penalizeUserAction(userId: string, points = 25): Promise<ActionResult> {
  const context = await getDeveloperContext();
  if (!context.ok) return { ok: false, message: context.message };

  const penalty = Math.max(1, Math.abs(points));
  const { data: profile, error: profileError } = await context.supabase
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return { ok: false, message: "No se encontró el usuario." };

  const nextPoints = Math.max(0, Number(profile.points ?? 0) - penalty);
  const { error: updateError } = await context.supabase
    .from("profiles")
    .update({ points: nextPoints, level: levelForPoints(nextPoints) })
    .eq("id", userId);

  if (updateError) return { ok: false, message: "No se pudo aplicar la penalización." };

  await context.supabase.from("points_ledger").insert({
    user_id: userId,
    action: "developer_penalty",
    points: -penalty,
    idempotency_key: `developer_penalty:${context.userId}:${userId}:${Date.now()}`
  });

  revalidatePath("/desarrollador");
  revalidatePath("/perfil");
  return { ok: true, message: `Penalización aplicada: -${penalty} XP.` };
}

export async function getAboutContentAction(): Promise<AboutContent> {
  return getAboutContent();
}

export async function saveAboutContentAction(content: AboutContent): Promise<ActionResult> {
  const context = await getDeveloperContext();
  if (!context.ok) return { ok: false, message: context.message };

  const title = content.title.trim();
  const intro = content.intro.trim();
  const composition = content.composition.trim();
  const creator = content.creator.trim();
  if (!title || !intro) return { ok: false, message: "Título y descripción son obligatorios." };

  const { error: contentError } = await context.supabase.from("about_content").upsert(
    {
      id: "main",
      title,
      intro,
      composition,
      creator_note: creator,
      updated_by: context.userId
    },
    { onConflict: "id" }
  );

  if (contentError) return { ok: false, message: "No se pudo guardar el contenido." };

  await context.supabase.from("about_people").update({ active: false, updated_by: context.userId }).eq("active", true);

  const people = content.people
    .map((person, index) => ({
      display_order: index,
      name: person.name.trim(),
      role: person.role.trim() || "Integrante",
      bio: person.bio.trim(),
      person_type: "member",
      photo_url: person.photoUrl || null,
      active: true,
      created_by: context.userId,
      updated_by: context.userId
    }))
    .filter((person) => person.name);

  if (people.length) {
    const { error: peopleError } = await context.supabase.from("about_people").upsert(people, { onConflict: "name,person_type" });
    if (peopleError) return { ok: false, message: "Contenido guardado, pero no se pudieron guardar las personas." };
  }

  revalidatePath("/");
  revalidatePath("/quienes-somos");
  revalidatePath("/desarrollador");
  return { ok: true, message: "Contenido público guardado." };
}

async function getDeveloperContext() {
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
  if (!active || !["admin", "developer"].includes(role)) {
    return { ok: false as const, message: "No tienes permisos de desarrollo." };
  }

  return { ok: true as const, supabase, userId: data.user.id };
}

function levelForPoints(points: number) {
  return LEVELS.find((level) => points >= level.minXp && (level.maxXp === null || points <= level.maxXp))?.level ?? 1;
}

function formatCriterionLabel(criterion: BadgeCriterion) {
  const label = BADGE_RULES.find((rule) => rule.value === criterion.rule)?.label ?? "Regla";
  return `${label}: ${criterion.threshold}`;
}
