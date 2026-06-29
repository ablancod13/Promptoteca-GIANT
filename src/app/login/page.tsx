import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="page page-narrow">
      <div className="auth-grid">
        <section className="side-panel stack">
          <span className="eyebrow">Acceso</span>
          <h2>Regístrate para disfrutar de todas las ventajas</h2>
          <p className="muted">Crea tu biblioteca, guarda favoritos, recibe puntos y comparte prompts con la comunidad.</p>
          <Link className="button secondary" href="/registro">
            Crear cuenta
          </Link>
        </section>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
