import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="page">
      <div className="auth-grid">
        <section className="side-panel stack">
          <span className="eyebrow">Perfil completo</span>
          <h2>Tu perfil GIANT</h2>
          <p className="muted">
            Personaliza tu experiencia y contribuye a una biblioteca colaborativa.
          </p>
          <Link className="button secondary" href="/legal/privacidad">
            Politica de privacidad
          </Link>
        </section>
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
