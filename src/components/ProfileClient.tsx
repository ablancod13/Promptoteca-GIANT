"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Award,
  Camera,
  Edit3,
  Heart,
  LogOut,
  Save,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  Upload
} from "lucide-react";
import { deleteAccountAction, getCurrentProfileAction, logoutAction, updateProfileAction } from "@/app/auth/actions";
import { listMyPromptContributionsAction, type PromptContribution } from "@/app/perfil/actions";
import { PROFESSIONAL_ROLES } from "@/lib/constants";
import { COUNTRIES_ES, SPAIN_AUTONOMOUS_COMMUNITIES } from "@/lib/registration-options";
import { canDevelop, canModerate, LOCAL_USER_KEY, getLocalUser, saveLocalUser, type LocalUser } from "@/lib/local-user";
import { getProgressToNextLevel } from "@/lib/gamification";
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

const LOCAL_ACCOUNT_KEYS = [
  LOCAL_USER_KEY,
  "giant_favorites",
  "giant_likes",
  "giant_private_folders",
  "giant_favorite_folders",
  "giant_private_notes",
  "giant_private_prompt_edits",
  "giant_custom_versions",
  "giant_xp_ledger"
];

export function ProfileClient() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [contributed, setContributed] = useState<PromptContribution[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsCountry, setSettingsCountry] = useState("España");
  const [settingsRole, setSettingsRole] = useState(PROFESSIONAL_ROLES[0]);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const refreshFromLocal = () => {
      const current = getLocalUser();
      setUser(current);
      setSettingsCountry(current?.country || "España");
      setSettingsRole(current?.role || PROFESSIONAL_ROLES[0]);
    };

    refreshFromLocal();
    getCurrentProfileAction().then((remoteUser) => {
      if (cancelled || !remoteUser) return;
      saveLocalUser(remoteUser);
      setUser(remoteUser);
      setSettingsCountry(remoteUser.country || "España");
      setSettingsRole(remoteUser.role || PROFESSIONAL_ROLES[0]);
    });
    listMyPromptContributionsAction().then((items) => {
      if (!cancelled) setContributed(items);
    });

    window.addEventListener("giant:user-updated", refreshFromLocal);
    window.addEventListener("storage", refreshFromLocal);
    return () => {
      cancelled = true;
      window.removeEventListener("giant:user-updated", refreshFromLocal);
      window.removeEventListener("storage", refreshFromLocal);
    };
  }, []);

  const progress = getProgressToNextLevel(user?.xp ?? 0);
  const earnedBadges = BADGES.filter((badge) => (user?.xp ?? 0) >= badge.minXp);
  const settingsIsSpain = isSpainCountry(settingsCountry);

  async function shareBadge(badge: BadgeDefinition) {
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
    ctx.fillText(`Conseguido por ${user?.displayName ?? user?.name ?? "Usuario GIANT"}`, 110, 470);

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
    setSettingsMessage("");

    startTransition(async () => {
      const result = await updateProfileAction({
        displayName:
          normalizeDisplayName(String(data.get("displayName") ?? user.displayName ?? user.name)) || user.displayName || user.name,
        country: String(data.get("country") ?? user.country ?? ""),
        region: String(data.get("region") ?? ""),
        city: String(data.get("city") ?? ""),
        professionalRole: String(data.get("professionalRole") ?? user.role),
        institution: String(data.get("institution") ?? ""),
        seimcMember: String(data.get("seimcMember") ?? "")
      });

      setSettingsMessage(result.message);
      if (result.ok && result.user) {
        saveLocalUser(result.user);
        setUser(result.user);
        setSettingsCountry(result.user.country || "España");
        setSettingsRole(result.user.role || PROFESSIONAL_ROLES[0]);
        setContributed(await listMyPromptContributionsAction());
      }
    });
  }

  function logout() {
    startTransition(async () => {
      await logoutAction();
      clearLocalAccountData();
      router.push("/");
    });
  }

  function deleteAccount() {
    if (!user) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    startTransition(async () => {
      const result = await deleteAccountAction();
      setSettingsMessage(result.message);
      if (!result.ok) return;
      clearLocalAccountData();
      router.push("/");
    });
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
          <div className="action-row">
            <button className="button secondary" type="button" onClick={() => setShowSettings((current) => !current)}>
              <Settings size={16} /> Modificar datos
            </button>
            <button className="button secondary" type="button" onClick={logout} disabled={isPending}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>
      </section>

      {showSettings ? (
        <section className="table-panel stack">
          <div className="section-head compact">
            <h2>Configuración</h2>
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
            <button className="button primary" type="submit" disabled={isPending}>
              <Save size={16} /> Guardar configuración
            </button>
            {settingsMessage ? <div className="callout">{settingsMessage}</div> : null}
          </form>
        </section>
      ) : null}

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
              {badge.imageUrl ? (
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
              <th>Estado</th>
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
                <td>
                  <span className="badge">{prompt.reviewStatus}</span>
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
            {!contributed.length ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">Aún no has compartido prompts.</div>
                </td>
              </tr>
            ) : null}
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

      <section className="account-danger-zone">
        <button className="button danger subtle-danger" type="button" onClick={deleteAccount} disabled={isPending}>
          <Trash2 size={15} /> {confirmDelete ? "Confirmar eliminación" : "Eliminar cuenta"}
        </button>
        {confirmDelete ? <small className="muted">Pulsa de nuevo para confirmar la eliminación de la cuenta.</small> : null}
      </section>
    </div>
  );
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isSpainCountry(value: string) {
  return value.trim().toLocaleLowerCase("es").startsWith("espa");
}

function clearLocalAccountData() {
  LOCAL_ACCOUNT_KEYS.forEach((key) => window.localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent("giant:user-updated"));
}
