import Link from "next/link";
import { CheckCircle2, MailCheck } from "lucide-react";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ConfirmAccountPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const confirmationUrl = buildConfirmationUrl(params);

  return (
    <main className="page page-narrow">
      <section className="form-panel stack">
        <span className="eyebrow">Confirmación de cuenta</span>
        <h1>Activa tu cuenta</h1>
        <p className="lead">
          Estás a un paso de entrar en la Promptoteca GIANT.
        </p>

        {confirmationUrl ? (
          <>
            <div className="callout">
              <MailCheck size={18} />
              Pulsa el botón para confirmar tu correo y completar el acceso.
            </div>
            <a className="button primary" href={confirmationUrl}>
              <CheckCircle2 size={17} /> Confirmar cuenta
            </a>
            <p className="muted">
              Si el botón no responde, copia y abre este enlace en el navegador:
            </p>
            <p className="muted break-link">{confirmationUrl}</p>
          </>
        ) : (
          <>
            <div className="callout warning">
              No hemos podido leer el enlace de confirmación. Solicita un nuevo correo de registro.
            </div>
            <Link className="button primary" href="/login">
              Ir a iniciar sesión
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

function buildConfirmationUrl(params: SearchParams) {
  const raw = getParam(params, "confirmation_url");
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return "";

    for (const key of ["token", "token_hash", "type", "redirect_to"]) {
      const value = getParam(params, key);
      if (value && !url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  } catch {
    return "";
  }
}

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}
