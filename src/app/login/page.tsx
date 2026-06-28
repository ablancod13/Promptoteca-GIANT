import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="page page-narrow">
      <div className="auth-grid">
        <section className="side-panel stack">
          <span className="eyebrow">Acceso</span>
          <h2>Usuarios registrados</h2>
          <p className="muted">Accede a tu biblioteca, favoritos, puntos y contribuciones.</p>
          <Link className="button secondary" href="/registro">
            Crear cuenta
          </Link>
        </section>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
