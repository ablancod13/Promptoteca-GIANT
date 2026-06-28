"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MinusCircle, ShieldAlert } from "lucide-react";
import { canDevelop, getLocalUser } from "@/lib/local-user";
import { DeveloperAboutEditor } from "@/components/DeveloperAboutEditor";

interface DemoUser {
  id: string;
  name: string;
  email: string;
  status: "active" | "blocked";
  xp: number;
}

const DEMO_USERS: DemoUser[] = [
  { id: "u1", name: "Ana Rivera", email: "ana@giant.local", status: "active", xp: 760 },
  { id: "u2", name: "Mateo Soler", email: "mateo@giant.local", status: "active", xp: 420 },
  { id: "u3", name: "Lucia Martin", email: "lucia@giant.local", status: "active", xp: 210 }
];

export function DeveloperPanel() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState(DEMO_USERS);

  useEffect(() => {
    setAllowed(canDevelop(getLocalUser()));
  }, []);

  const filteredUsers = useMemo(
    () => users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())),
    [query, users]
  );

  function toggleBlock(userId: string) {
    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, status: user.status === "active" ? "blocked" : "active" } : user))
    );
  }

  function penalize(userId: string) {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, xp: Math.max(0, user.xp - 25) } : user)));
  }

  if (allowed === false) {
    return (
      <section className="form-panel stack">
        <h1>Desarrollador</h1>
        <p className="lead">Solo creador, administradores o usuarios asignados pueden entrar aquí.</p>
        <Link className="button primary" href="/perfil">
          Volver al perfil
        </Link>
      </section>
    );
  }

  if (allowed === null) {
    return (
      <section className="form-panel stack">
        <h1>Desarrollador</h1>
      </section>
    );
  }

  return (
    <div className="stack">
      <DeveloperAboutEditor />

      <section className="table-panel stack">
        <div className="section-head compact">
          <h2>Usuarios</h2>
          <span className="badge amber">
            <ShieldAlert size={14} /> Herramientas sensibles
          </span>
        </div>
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario" />
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Estado</th>
              <th>XP</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <p className="muted">{user.email}</p>
                </td>
                <td>{user.status}</td>
                <td>{user.xp}</td>
                <td>
                  <div className="action-row">
                    <button className="button secondary" type="button" onClick={() => toggleBlock(user.id)}>
                      {user.status === "active" ? "Bloquear" : "Reactivar"}
                    </button>
                    <button className="button danger" type="button" onClick={() => penalize(user.id)}>
                      <MinusCircle size={16} /> -25 XP
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
