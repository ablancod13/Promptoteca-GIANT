"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Info, LogIn, UserPlus } from "lucide-react";
import { loginAction, registerAction } from "@/app/auth/actions";
import { PROFESSIONAL_ROLES, RECOMMENDED_TOOLS } from "@/lib/constants";
import {
  COUNTRIES_ES,
  INSTITUTION_TYPES,
  PRIMARY_ACTIVITY_AREAS,
  SPAIN_AUTONOMOUS_COMMUNITIES
} from "@/lib/registration-options";
import { saveLocalUser } from "@/lib/local-user";

const ROLES_WITH_DETAIL = new Set(["Otro", "Estudiante", "Residente"]);

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isRegister = mode === "register";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const displayName = normalizeDisplayName(String(data.get("displayName") ?? ""));

    if (isRegister && !displayName) {
      setMessage("El nombre a mostrar es obligatorio.");
      return;
    }

    const selectedTools = data.getAll("aiTools").map(String);
    setMessage("");

    startTransition(async () => {
      const result = isRegister
        ? await registerAction({
            email,
            password: String(data.get("password") ?? ""),
            name: String(data.get("name") ?? ""),
            surname: String(data.get("surname") ?? ""),
            displayName,
            country: String(data.get("country") ?? ""),
            region: String(data.get("region") ?? ""),
            city: String(data.get("city") ?? ""),
            birthYear: String(data.get("birthYear") ?? ""),
            professionalRole: String(data.get("professionalRole") ?? ""),
            roleDetail: String(data.get("roleDetail") ?? ""),
            specializationYear: String(data.get("specializationYear") ?? ""),
            institution: String(data.get("institution") ?? ""),
            seimcMember: String(data.get("seimcMember") ?? ""),
            licenseNumber: String(data.get("licenseNumber") ?? ""),
            institutionType: String(data.get("institutionType") ?? ""),
            primaryActivityArea: String(data.get("primaryActivityArea") ?? ""),
            professionalExperienceYears: String(data.get("professionalExperienceYears") ?? ""),
            aiFrequency: String(data.get("aiFrequency") ?? ""),
            aiProfessionalUse: String(data.get("aiProfessionalUse") ?? ""),
            aiLevel: String(data.get("aiLevel") ?? ""),
            aiTools: selectedTools,
            aiToolsOther: String(data.get("aiToolsOther") ?? "")
          })
        : await loginAction({
            email,
            password: String(data.get("password") ?? "")
          });

      setMessage(result.message);
      if (!result.ok) return;

      if (result.user) {
        saveLocalUser(result.user);
        router.push("/perfil");
      }
    });
  }

  return (
    <form className="form-panel stack" onSubmit={submit}>
      <div>
        <span className="eyebrow">{isRegister ? "Registro abierto verificado" : "Acceso"}</span>
        <h1>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h1>
      </div>
      <div className="grid two">
        {isRegister ? (
          <>
            <label className="field">
              <span>Nombre</span>
              <input className="input" name="name" required />
            </label>
            <label className="field">
              <span>Apellidos</span>
              <input className="input" name="surname" required />
            </label>
            <label className="field">
              <span>Nombre a mostrar o apodo</span>
              <input className="input" name="displayName" required maxLength={42} placeholder="Ej. Andrés Blanco" />
            </label>
          </>
        ) : null}
        <label className="field">
          <span>Correo electrónico</span>
          <input className="input" name="email" type="email" required />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input className="input" name="password" type="password" required minLength={8} />
        </label>
      </div>
      {isRegister ? <ProfileFields /> : null}
      <button className="button primary" type="submit" disabled={isPending}>
        {isRegister ? <UserPlus size={17} /> : <LogIn size={17} />}
        {isPending ? "Procesando..." : isRegister ? "Crear cuenta" : "Entrar"}
      </button>
      {message ? <div className="callout">{message}</div> : null}
    </form>
  );
}

function ProfileFields() {
  const [country, setCountry] = useState("España");
  const [professionalRole, setProfessionalRole] = useState(PROFESSIONAL_ROLES[0]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const isSpain = country === "España";
  const needsRoleDetail = ROLES_WITH_DETAIL.has(professionalRole);
  const usesOtherTool = selectedTools.includes("Otro");

  function toggleTool(tool: string, checked: boolean) {
    setSelectedTools((current) => {
      if (checked) return [...new Set([...current, tool])];
      return current.filter((item) => item !== tool);
    });
  }

  return (
    <div className="stack">
      <div className="grid three">
        <label className="field">
          <span>País de residencia</span>
          <select className="select" name="country" required value={country} onChange={(event) => setCountry(event.target.value)}>
            {COUNTRIES_ES.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {isSpain ? (
          <label className="field">
            <span>Comunidad autónoma de residencia</span>
            <select className="select" name="region" required>
              {SPAIN_AUTONOMOUS_COMMUNITIES.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Ciudad</span>
            <input className="input" name="city" required />
          </label>
        )}
        <label className="field">
          <span>Año de nacimiento</span>
          <input className="input" name="birthYear" type="number" min="1900" max="2010" required />
        </label>
      </div>

      <div className="grid three">
        <label className="field">
          <span>Rol profesional principal</span>
          <select
            className="select"
            name="professionalRole"
            required
            value={professionalRole}
            onChange={(event) => setProfessionalRole(event.target.value)}
          >
            {PROFESSIONAL_ROLES.map((role) => (
              <option value={role} key={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Año de especialización</span>
          <input className="input" name="specializationYear" type="number" min="1950" max="2050" placeholder="Ej. 2024" />
        </label>
        {needsRoleDetail ? (
          <label className="field">
            <span>Por favor, especifique</span>
            <input className="input" name="roleDetail" required />
          </label>
        ) : null}
      </div>

      <div className="grid three">
        <label className="field">
          <span>Centro de trabajo (nombre completo)</span>
          <input className="input" name="institution" />
        </label>
        <label className="field">
          <span>Pertenencia a SEIMC</span>
          <select className="select" name="seimcMember" required>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="field">
          <span className="label-with-info">
            Número de colegio profesional
            <span
              className="info-tooltip"
              tabIndex={0}
              aria-label="Permitirá en una fase más avanzada del proyecto acceder a prompts restringidos para profesionales acreditados"
            >
              <Info size={15} />
              <span>Permitirá en una fase más avanzada del proyecto acceder a prompts restringidos para profesionales acreditados</span>
            </span>
          </span>
          <input className="input" name="licenseNumber" />
        </label>
      </div>

      <div className="grid three">
        <label className="field">
          <span>Tipo de centro</span>
          <select className="select" name="institutionType">
            <option value="">Sin especificar</option>
            {INSTITUTION_TYPES.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Ámbito principal</span>
          <select className="select" name="primaryActivityArea">
            <option value="">Sin especificar</option>
            {PRIMARY_ACTIVITY_AREAS.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Años de experiencia profesional</span>
          <input className="input" name="professionalExperienceYears" type="number" min="0" max="70" />
        </label>
      </div>

      <div className="grid three">
        <label className="field">
          <span>Frecuencia de uso IA</span>
          <select className="select" name="aiFrequency" required>
            <option>Nunca</option>
            <option>Ocasionalmente</option>
            <option>Mensualmente</option>
            <option>Semanalmente</option>
            <option>A diario</option>
          </select>
        </label>
        <label className="field">
          <span>Uso profesional de IA</span>
          <select className="select" name="aiProfessionalUse" required>
            <option>No la utilizo profesionalmente</option>
            <option>Sí, de forma ocasional</option>
            <option>Sí, de forma habitual</option>
            <option>Sí, es parte central de mi trabajo</option>
          </select>
        </label>
        <label className="field">
          <span>Nivel autopercibido</span>
          <select className="select" name="aiLevel" required>
            <option>Básico</option>
            <option>Intermedio</option>
            <option>Avanzado</option>
            <option>Experto</option>
          </select>
        </label>
      </div>

      <div className="field">
        <span>Herramientas utilizadas</span>
        <div className="checkbox-grid">
          {RECOMMENDED_TOOLS.map((tool) => (
            <label className="check-card" key={tool}>
              <input
                type="checkbox"
                name="aiTools"
                value={tool}
                checked={selectedTools.includes(tool)}
                onChange={(event) => toggleTool(tool, event.target.checked)}
              />
              <span>{tool}</span>
            </label>
          ))}
        </div>
      </div>
      {usesOtherTool ? (
        <label className="field">
          <span>Otra herramienta utilizada</span>
          <input className="input" name="aiToolsOther" required />
        </label>
      ) : null}

      <label className="toggle">
        <input name="terms" type="checkbox" required /> Acepto los{" "}
        <Link href="/legal/terminos" target="_blank" rel="noreferrer">
          términos de uso
        </Link>
      </label>
      <label className="toggle">
        <input name="privacy" type="checkbox" required /> Acepto la{" "}
        <Link href="/legal/privacidad" target="_blank" rel="noreferrer">
          política de privacidad
        </Link>
      </label>
    </div>
  );
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
