import type { PlatformRole } from "@/lib/types";

export interface LocalUser {
  id?: string;
  email: string;
  name: string;
  surname?: string;
  displayName?: string;
  role: string;
  platformRole: PlatformRole;
  xp: number;
  createdAt: string;
  notificationsReadAt?: string;
  country?: string;
  region?: string;
  city?: string;
  birthYear?: string;
  roleDetail?: string;
  specializationYear?: string;
  institution?: string;
  licenseNumber?: string;
  seimcMember?: string;
  institutionType?: string;
  primaryActivityArea?: string;
  professionalExperienceYears?: string;
  aiFrequency?: string;
  aiProfessionalUse?: string;
  aiLevel?: string;
  aiTools?: string[];
  accountStatus?: string;
}

export const LOCAL_USER_KEY = "giant_demo_user";

export function getLocalUser(): LocalUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LOCAL_USER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<LocalUser>;
    return {
      email: parsed.email ?? "",
      id: parsed.id,
      name: parsed.name || "Usuario GIANT",
      surname: parsed.surname ?? "",
      displayName: parsed.displayName || parsed.name || "Usuario GIANT",
      role: parsed.role ?? "registered",
      platformRole: parsed.platformRole ?? "registered",
      xp: parsed.xp ?? 186,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      notificationsReadAt: parsed.notificationsReadAt,
      country: parsed.country,
      region: parsed.region,
      city: parsed.city,
      birthYear: parsed.birthYear,
      roleDetail: parsed.roleDetail,
      specializationYear: parsed.specializationYear,
      institution: parsed.institution,
      licenseNumber: parsed.licenseNumber,
      seimcMember: parsed.seimcMember,
      institutionType: parsed.institutionType,
      primaryActivityArea: parsed.primaryActivityArea,
      professionalExperienceYears: parsed.professionalExperienceYears,
      aiFrequency: parsed.aiFrequency,
      aiProfessionalUse: parsed.aiProfessionalUse,
      aiLevel: parsed.aiLevel,
      aiTools: parsed.aiTools,
      accountStatus: parsed.accountStatus
    };
  } catch {
    return null;
  }
}

export function saveLocalUser(user: LocalUser): void {
  window.localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("giant:user-updated"));
}

export function awardLocalXp(idempotencyKey: string, points: number): LocalUser | null {
  const user = getLocalUser();
  if (!user) return null;

  const rawLedger = window.localStorage.getItem("giant_xp_ledger");
  const ledger = new Set(rawLedger ? (JSON.parse(rawLedger) as string[]) : []);
  if (ledger.has(idempotencyKey)) return user;

  ledger.add(idempotencyKey);
  const next = { ...user, xp: Math.max(0, user.xp + points) };
  saveLocalUser(next);
  window.localStorage.setItem("giant_xp_ledger", JSON.stringify(Array.from(ledger)));
  return next;
}

export function canModerate(user: LocalUser | null): boolean {
  return Boolean(user && ["moderator", "admin", "developer"].includes(user.platformRole));
}

export function canDevelop(user: LocalUser | null): boolean {
  return Boolean(user && ["admin", "developer"].includes(user.platformRole));
}
