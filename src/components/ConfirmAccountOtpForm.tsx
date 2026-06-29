"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { verifySignupOtpAction } from "@/app/auth/actions";
import { saveLocalUser } from "@/lib/local-user";

export function ConfirmAccountOtpForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setMessage("");

    startTransition(async () => {
      const result = await verifySignupOtpAction({
        email: String(data.get("email") ?? ""),
        token: String(data.get("token") ?? "")
      });

      setMessage(result.message);
      if (result.ok && result.user) {
        saveLocalUser(result.user);
        router.push("/perfil");
      }
    });
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="grid two">
        <label className="field">
          <span>Correo electrónico</span>
          <input className="input" name="email" type="email" required />
        </label>
        <label className="field">
          <span>Código de confirmación</span>
          <input className="input" name="token" inputMode="numeric" autoComplete="one-time-code" required />
        </label>
      </div>
      <button className="button primary" type="submit" disabled={isPending}>
        <CheckCircle2 size={17} /> {isPending ? "Confirmando..." : "Confirmar con código"}
      </button>
      {message ? <div className="callout">{message}</div> : null}
    </form>
  );
}
