"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Award, Camera, Edit3, Heart, LogOut, Save, ShieldCheck, Star, Trash2, Upload } from "lucide-react";
import { PROFESSIONAL_ROLES } from "@/lib/constants";
import { COUNTRIES_ES, SPAIN_AUTONOMOUS_COMMUNITIES } from "@/lib/registration-options";
import { canDevelop, canModerate, getLocalUser, LOCAL_USER_KEY, saveLocalUser, type LocalUser } from "@/lib/local-user";
import { getProgressToNextLevel } from "@/lib/gamification";
import type { Prompt } from "@/lib/types";
import { LevelAvatar } from "@/components/LevelAvatar";

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  minXp: number;
  imageUrl?: string;
  imageAlt?: string;
}

const BADGES: BadgeDefinition[] = [
  {
    id: "inicio",
    name: "Primer paso GIANT",
    description: "Cuenta creada y perfil profesional completo.",
    minXp: 0,
    imageUrl: "/giant-logo.png",
    imageAlt: "Logro GIANT"
  },
  { id: "curador", name: "Curador de prompts", description: "Ha guardado y organizado prompts en su biblioteca.", minXp: 80 },
  { id: "contribuidor", name: "Contribuidor/a", description: "Ha contribuido a la biblioteca de la comunidad.", minXp: 150 },
  { id: "referente", name: "Referente GIANT", description: "Sus aportes generan uso y reconocimiento.", minXp: 750 }
];

const DISPLAY_NAMES_KEY = "giant_display_names";

export function ProfileClient({ prompts }: { prompts: Prompt[] }) {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [settingsCountry, setSettingsCountry] = useState("España");
  const [settingsRole, setSettingsRole] = useState(PROFESSIONAL_ROLES[0]);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const current = getLocalUser();
      setUser(current);
      setSettingsCountry(current?.country || "España");
      setSettingsRole(current?.role || PROFESSIONAL_ROLES[0]);
    };
    refresh();
    window.addEventListener("giant:user-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("giant:user-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const progress = getProgressToNextLevel(user?.xp ?? 0);
  const contributed = useMemo(() => prompts.slice(0, 4), [prompts]);
  const earnedBadges = BADGES.filter((badge) => (user?.xp ?? 0) >= badge.minXp);
  const settingsIsSpain = settingsCountry === "España";

  async function shareBadge(badge: (typeof BADGES)[number]) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#DFF4F6";
    ctx.fillRect(64, 64, 1072, 502);
    ctx.fillStyle = "#017F88";
    ctx.font = "bold 62px Arial";
    ctx.fillText("Promptoteca GIANT", 110, 170);
    ctx.fillStyle = "#EC490D";
    ctx.font = "bold 72px Arial";
    ctx.fillText(badge.name, 110, 300);
    ctx.fillStyle = "#343434";
    ctx.font = "34px Arial";
    ctx.fillText(badge.description, 110, 380);
    ctx.fillStyle = "#6B7280";
    ctx.font = "28px Arial";
    ctx.fillText(`Conseguido por ${user?.name ?? "Usuario GIANT"}`, 110, 470);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;

    const file = new File([blob], `${badge.id}-promptoteca-giant.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: badge.name, text: badge.description, files: [file] });
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const data = new FormData(event.currentTarget);
    const next: LocalUser = {
      ...user,
      displayName: normalizeDisplayName(String(data.get("displayName") ?? user.displayName ?? user.name)) || user.displayName || user.name,
      country: String(data.get("country") ?? user.country ?? ""),
      region: String(data.get("region") ?? ""),
      city: String(data.get("city") ?? ""),
      role: String(data.get("professionalRole") ?? user.role),
      institution: String(data.get("institution") ?? ""),
      seimcMember: String(data.get("seimcMember") ?? "")
    };
    if (next.displayName && next.displayName !== user.displayName && isDisplayNameTaken(next.displayName)) {
      setSettingsMessage("Ese nombre a mostrar ya está en uso. Elige otro.");
      return;
    }
    if (next.displayName && next.displayName !== user.displayName) reserveDisplayName(next.displayName);
    saveLocalUser(next);
    setUser(next);
    setSettingsMessage("Configuración guardada.");
  }

  function logout() {
    window.localStorage.removeItem(LOCAL_USER_KEY);
    window.dispatchEvent(new CustomEvent("giant:user-updated"));
    router.push("/");
  }

  function deleteAccount() {
    if (!user) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    if (user.displayName) {
      const nextNames = getReservedDisplayNames().filter(
        (item) => item.toLocaleLowerCase("es") !== user.displayName?.toLocaleLowerCase("es")
      );
      window.localStorage.setItem(DISPLAY_NAMES_KEY, JSON.stringify(nextNames));
    }

    [
      LOCAL_USER_KEY,
      "giant_favorites",
      "giant_likes",
      "giant_private_folders",
      "giant_favorite_folders",
      "giant_private_notes",
      "giant_private_prompt_edits",
      "giant_custom_versions",
      "giant_xp_ledger"
    ].forEach((key) => window.localStorage.removeItem(key));
    window.dispatchEvent(new CustomEvent("giant:user-updated"));
    router.push("/");
  }

  if (!user) {
    return (
      <section className="form-panel stack">
        <h1>Perfil</h1>
        <p className="lead">Inicia sesión para ver tu progreso, biblioteca y contribuciones.</p>
        <Link className="button primary" href="/login">
          Entrar
        </Link>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="profile-hero">
        <div className="stack">
          <div className="profile-title-row">
            <LevelAvatar xp={user.xp} size="lg" />
            <div className="stack">
              <span className="eyebrow">Perfil</span>
              <h1>{user.displayName || user.name}</h1>
              <p className="lead">{user.role}</p>
            </div>
          </div>
          <div className="badge-row">
            <span className="badge teal">{progress.current.name}</span>
            {canModerate(user) ? <span className="badge blue">Moderador</span> : null}
            {canDevelop(user) ? <span className="badge amber">Desarrollador</span> : null}
          </div>
        </div>
        <div className="side-panel stack">
          <strong>{user.xp} puntos experiencia</strong>
          <div className="progress-bar">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="muted">{progress.next ? `Siguiente: ${progress.next.name}` : "Nivel máximo"}</span>
        </div>
      </section>

      <section className="table-panel stack">
        <div className="section-head compact">
          <h2>Configuración</h2>
          <div className="action-row">
            <button className="button secondary" type="button" onClick={logout}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
        <form className="stack" onSubmit={saveSettings}>
          <div className="grid three">
            <label className="field">
              <span>Nombre a mostrar</span>
              <input className="input" name="displayName" defaultValue={user.displayName || user.name} required />
            </label>
            <label className="field">
              <span>País de residencia</span>
              <select
                className="select"
                name="country"
                value={settingsCountry}
                onChange={(event) => setSettingsCountry(event.target.value)}
              >
                {COUNTRIES_ES.map((country) => (
                  <option value={country} key={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>
            {settingsIsSpain ? (
              <label className="field">
                <span>Comunidad autónoma</span>
                <select className="select" name="region" defaultValue={user.region ?? SPAIN_AUTONOMOUS_COMMUNITIES[0]}>
                  {SPAIN_AUTONOMOUS_COMMUNITIES.map((region) => (
                    <option value={region} key={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                <span>Ciudad</span>
                <input className="input" name="city" defaultValue={user.city ?? ""} />
              </label>
            )}
          </div>
          <div className="grid three">
            <label className="field">
              <span>Año de nacimiento</span>
              <input className="input" value={user.birthYear ?? "No indicado"} disabled readOnly />
            </label>
            <label className="field">
              <span>Rol profesional</span>
              <select
                className="select"
                name="professionalRole"
                value={settingsRole}
                onChange={(event) => setSettingsRole(event.target.value)}
              >
                {PROFESSIONAL_ROLES.map((role) => (
                  <option value={role} key={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Centro de trabajo</span>
              <input className="input" name="institution" defaultValue={user.institution ?? ""} />
            </label>
          </div>
          <div className="grid three">
            <label className="field">
              <span>Pertenencia a SEIMC</span>
              <select className="select" name="seimcMember" defaultValue={user.seimcMember ?? ""}>
                <option value="">Sin indicar</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="field">
              <span>Frecuencia de uso IA</span>
              <input className="input" value={user.aiFrequency ?? "No indicado"} disabled readOnly />
            </label>
            <label className="field">
              <span>Nivel autopercibido</span>
              <input className="input" value={user.aiLevel ?? "No indicado"} disabled readOnly />
            </label>
          </div>
          <div className="callout">
            <strong>Datos no editables</strong>
            <p className="muted">
              Uso profesional de IA: {user.aiProfessionalUse ?? "No indicado"}. Herramientas utilizadas:{" "}
              {user.aiTools?.length ? user.aiTools.join(", ") : "No indicado"}.
            </p>
          </div>
          <div className="action-row">
            <button className="button primary" type="submit">
              <Save size={16} /> Guardar configuración
            </button>
            <button className="button danger" type="button" onClick={deleteAccount}>
              <Trash2 size={16} /> {confirmDelete ? "Confirmar eliminación" : "Eliminar cuenta"}
            </button>
          </div>
          {settingsMessage ? <div className="callout">{settingsMessage}</div> : null}
          {confirmDelete ? <div className="callout warning">Pulsa de nuevo para confirmar la eliminación de la cuenta local.</div> : null}
        </form>
      </section>

      <section className="grid three">
        <div className="metric">
          <strong>{contributed.reduce((sum, prompt) => sum + prompt.copies, 0)}</strong>
          <span>Usos de tus prompts</span>
        </div>
        <div className="metric">
          <strong>{contributed.reduce((sum, prompt) => sum + prompt.favorites, 0)}</strong>
          <span>Favoritos de otros usuarios</span>
        </div>
        <div className="metric">
          <strong>{contributed.reduce((sum, prompt) => sum + prompt.likes, 0)}</strong>
          <span>Me gusta recibidos</span>
        </div>
      </section>

      <section className="table-panel stack">
        <div className="section-head compact">
          <h2>Logros</h2>
          <span className="badge">{earnedBadges.length}/{BADGES.length}</span>
        </div>
        <div className="grid four">
          {earnedBadges.map((badge) => (
            <article className="achievement" key={badge.id}>
              {"imageUrl" in badge && badge.imageUrl ? (
                <img className="badge-image" src={badge.imageUrl} alt={badge.imageAlt ?? badge.name} />
              ) : (
                <Award size={28} />
              )}
              <strong>{badge.name}</strong>
              <p className="muted">{badge.description}</p>
              <button className="button secondary" type="button" onClick={() => shareBadge(badge)}>
                <Camera size={16} /> Compartir
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="table-panel stack">
        <div className="section-head compact">
          <h2>Prompts en los que has contribuido</h2>
          <Link className="button accent" href="/subir">
            <Upload size={16} /> Compartir
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Prompt</th>
              <th>Usos</th>
              <th>Favoritos</th>
              <th>Me gusta</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {contributed.map((prompt) => (
              <tr key={prompt.id}>
                <td>
                  <Link href={`/prompts/${prompt.slug}`}>
                    <strong>{prompt.title}</strong>
                  </Link>
                  <p className="muted">{prompt.summary}</p>
                </td>
                <td>{prompt.copies}</td>
                <td>
                  <Star size={15} /> {prompt.favorites}
                </td>
                <td>
                  <Heart size={15} /> {prompt.likes}
                </td>
                <td>
                  <Link className="button secondary" href={`/prompts/${prompt.slug}/editar`}>
                    <Edit3 size={16} /> Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="callout">
          <ShieldCheck size={16} /> Las ediciones aprobadas mantienen las estadísticas del prompt original.
        </div>
      </section>

      {canModerate(user) ? (
        <section className="table-panel stack">
          <h2>Moderación</h2>
          <p className="muted">Accede a la cola de revisión y a las estadísticas globales de favoritos.</p>
          <Link className="button primary" href="/moderacion">
            Abrir moderación
          </Link>
        </section>
      ) : null}

      {canDevelop(user) ? (
        <section className="table-panel stack">
          <h2>Desarrollador</h2>
          <p className="muted">Gestión avanzada de usuarios, puntos y estadísticas.</p>
          <Link className="button primary" href="/desarrollador">
            Abrir panel
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getReservedDisplayNames() {
  const stored = window.localStorage.getItem(DISPLAY_NAMES_KEY);
  return stored ? (JSON.parse(stored) as string[]) : [];
}

function isDisplayNameTaken(value: string) {
  const normalized = value.toLocaleLowerCase("es");
  return getReservedDisplayNames().some((item) => item.toLocaleLowerCase("es") === normalized);
}

function reserveDisplayName(value: string) {
  const current = getReservedDisplayNames();
  window.localStorage.setItem(DISPLAY_NAMES_KEY, JSON.stringify([...current, value]));
}
