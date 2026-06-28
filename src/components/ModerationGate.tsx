"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { canModerate, getLocalUser } from "@/lib/local-user";

export function ModerationGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    setAllowed(canModerate(getLocalUser()));
  }, []);

  if (allowed === null) {
    return (
      <main className="page page-narrow">
        <section className="form-panel stack">
          <h1>Moderación</h1>
        </section>
      </main>
    );
  }

  if (allowed === false) {
    return (
      <main className="page page-narrow">
        <section className="form-panel stack">
          <h1>Moderación</h1>
          <p className="lead">Esta función solo se muestra a perfiles con rol de moderación aprobado.</p>
          <Link className="button primary" href="/perfil">
            Volver al perfil
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
