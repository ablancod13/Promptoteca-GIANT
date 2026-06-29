"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LocalUser } from "@/lib/local-user";
import type { PlatformRole } from "@/lib/types";

type AuthResult =
  | { ok: true; message: string; user: LocalUser | null }
  | { ok: false; message: string };

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  surname: string;
  displayName: string;
  country: string;
  region: string;
  city: string;
  birthYear: string;
  professionalRole: string;
  roleDetail: string;
  specializationYear: string;
  institution: string;
  seimcMember: string;
  licenseNumber: string;
  institutionType: string;
  primaryActivityArea: string;
  professionalExperienceYears: string;
  aiFrequency: string;
  aiProfessionalUse: string;
  aiLevel: string;
  aiTools: string[];
  aiToolsOther: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface VerifySignupOtpPayload {
  email: string;
  token: string;
}

interface ProfileUpdatePayload {
  displayName: string;
  country: string;
  region: string;
  city: string;
  professionalRole: string;
  institution: string;
  seimcMember: string;
}

export async function registerAction(payload: RegisterPayload): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase || !admin) {
    return { ok: false, message: "Supabase no esta configurado. Revisa las variables de entorno." };
  }

  const displayName = normalizeDisplayName(payload.displayName);
  if (!displayName) return { ok: false, message: "El nombre a mostrar es obligatorio." };

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/perfil`;
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim().toLocaleLowerCase("es"),
    password: payload.password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        first_name: payload.name,
        last_name: payload.surname,
        display_name: displayName
      }
    }
  });

  if (error || !data.user) {
    return { ok: false, message: translateAuthError(error?.message ?? "No se pudo crear la cuenta.") };
  }

  if (data.user.identities && data.user.identities.length === 0) {
    return { ok: false, message: "Ese correo ya esta registrado." };
  }

  const profile = buildProfileInsert(data.user.id, payload, displayName);
  const { data: insertedProfile, error: profileError } = await admin
    .from("profiles")
    .insert(profile)
    .select("*")
    .single();

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: translateProfileError(profileError.message) };
  }

  return {
    ok: true,
    message: data.session
      ? "Cuenta creada. Sesion iniciada."
      : "Cuenta creada. Revisa tu correo para confirmar el registro antes de entrar.",
    user: data.session ? profileRowToLocalUser(insertedProfile) : null
  };
}

export async function loginAction(payload: LoginPayload): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, message: "Supabase no esta configurado. Revisa las variables de entorno." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim().toLocaleLowerCase("es"),
    password: payload.password
  });

  if (error) return { ok: false, message: translateAuthError(error.message) };

  const user = await getCurrentLocalUser();
  if (!user) return { ok: false, message: "Sesion iniciada, pero no se encontro el perfil." };

  revalidatePath("/");
  return { ok: true, message: "Sesion iniciada.", user };
}

export async function verifySignupOtpAction(payload: VerifySignupOtpPayload): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { ok: false, message: "Supabase no esta configurado. Revisa las variables de entorno." };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: payload.email.trim().toLocaleLowerCase("es"),
    token: payload.token.trim(),
    type: "signup"
  });

  if (error) return { ok: false, message: translateAuthError(error.message) };

  const user = await getCurrentLocalUser();
  if (!user) return { ok: false, message: "Cuenta confirmada, pero no se encontro el perfil." };

  revalidatePath("/");
  return { ok: true, message: "Cuenta confirmada.", user };
}

export async function logoutAction(): Promise<{ ok: true }> {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  revalidatePath("/");
  return { ok: true };
}

export async function getCurrentProfileAction(): Promise<LocalUser | null> {
  return getCurrentLocalUser();
}

export async function updateProfileAction(payload: ProfileUpdatePayload): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "Supabase no esta configurado." };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, message: "Inicia sesion para actualizar tu perfil." };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: normalizeDisplayName(payload.displayName),
      country: payload.country,
      region: isSpainCountry(payload.country) ? payload.region : "",
      city: isSpainCountry(payload.country) ? null : payload.city,
      professional_role: payload.professionalRole,
      institution: payload.institution || null,
      seimc_member: parseSpanishBoolean(payload.seimcMember)
    })
    .eq("id", authData.user.id)
    .select("*")
    .single();

  if (error) return { ok: false, message: translateProfileError(error.message) };

  revalidatePath("/perfil");
  return { ok: true, message: "Configuracion guardada.", user: profileRowToLocalUser(data) };
}

export async function deleteAccountAction(): Promise<{ ok: boolean; message: string }> {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return { ok: false, message: "Supabase no esta configurado." };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: "No hay una sesion activa." };

  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return { ok: false, message: "No se pudo eliminar la cuenta." };

  await supabase.auth.signOut();
  revalidatePath("/");
  return { ok: true, message: "Cuenta eliminada." };
}

async function getCurrentLocalUser(): Promise<LocalUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", authData.user.id).single();
  if (error || !data) return null;

  return profileRowToLocalUser(data);
}

function buildProfileInsert(userId: string, payload: RegisterPayload, displayName: string) {
  const country = payload.country || "España";
  const isSpain = isSpainCountry(country);
  const selectedTools = payload.aiTools.filter(Boolean);

  return {
    id: userId,
    email: payload.email.trim().toLocaleLowerCase("es"),
    first_name: payload.name.trim(),
    last_name: payload.surname.trim(),
    display_name: displayName,
    country,
    region: isSpain ? payload.region || "Andalucia" : "",
    city: isSpain ? null : payload.city || null,
    birth_year: toNumberOrNull(payload.birthYear),
    professional_role: payload.professionalRole,
    role_detail: payload.roleDetail || null,
    specialization_year: toNumberOrNull(payload.specializationYear),
    institution: payload.institution || null,
    institution_type: payload.institutionType || null,
    primary_activity_area: payload.primaryActivityArea || null,
    professional_experience_years: toNumberOrNull(payload.professionalExperienceYears),
    seimc_member: parseSpanishBoolean(payload.seimcMember),
    license_number: payload.licenseNumber || null,
    ai_experience_level: payload.aiLevel,
    ai_professional_use: payload.aiProfessionalUse,
    ai_frequency: payload.aiFrequency,
    ai_tools: selectedTools,
    ai_tools_other: payload.aiToolsOther || null,
    points: 5,
    level: 1
  };
}

function profileRowToLocalUser(row: Record<string, any>): LocalUser {
  return {
    email: String(row.email ?? ""),
    name: String(row.first_name ?? "Usuario"),
    surname: String(row.last_name ?? ""),
    displayName: String(row.display_name ?? row.first_name ?? "Usuario GIANT"),
    role: String(row.professional_role ?? "registered"),
    platformRole: String(row.platform_role ?? "registered") as PlatformRole,
    xp: Number(row.points ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    country: String(row.country ?? ""),
    region: String(row.region ?? ""),
    city: row.city ? String(row.city) : "",
    birthYear: row.birth_year ? String(row.birth_year) : "",
    roleDetail: row.role_detail ? String(row.role_detail) : "",
    specializationYear: row.specialization_year ? String(row.specialization_year) : "",
    institution: row.institution ? String(row.institution) : "",
    licenseNumber: row.license_number ? String(row.license_number) : "",
    seimcMember: typeof row.seimc_member === "boolean" ? (row.seimc_member ? "si" : "no") : "",
    institutionType: row.institution_type ? String(row.institution_type) : "",
    primaryActivityArea: row.primary_activity_area ? String(row.primary_activity_area) : "",
    professionalExperienceYears: row.professional_experience_years ? String(row.professional_experience_years) : "",
    aiFrequency: String(row.ai_frequency ?? ""),
    aiProfessionalUse: String(row.ai_professional_use ?? ""),
    aiLevel: String(row.ai_experience_level ?? ""),
    aiTools: Array.isArray(row.ai_tools) ? row.ai_tools.map(String) : []
  };
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toNumberOrNull(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== "" ? parsed : null;
}

function parseSpanishBoolean(value: string) {
  if (value === "si") return true;
  if (value === "no") return false;
  return null;
}

function isSpainCountry(value: string) {
  return value.trim().toLocaleLowerCase("es").startsWith("espa");
}

function translateAuthError(message: string) {
  if (message.toLowerCase().includes("invalid login")) return "Correo o contrasena incorrectos.";
  if (message.toLowerCase().includes("already registered")) return "Ese correo ya esta registrado.";
  if (message.toLowerCase().includes("email not confirmed")) return "Confirma tu correo antes de entrar.";
  return message;
}

function translateProfileError(message: string) {
  if (message.toLowerCase().includes("profiles_display_name_unique")) {
    return "Ese nombre a mostrar ya esta en uso. Elige otro.";
  }
  if (message.toLowerCase().includes("duplicate key")) {
    return "Ese nombre a mostrar o correo ya esta en uso.";
  }
  return message;
}
