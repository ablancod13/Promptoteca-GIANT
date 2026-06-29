"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { MinusCircle, Search, ShieldAlert } from "lucide-react";
import {
  canDevelopAction,
  listDeveloperUsersAction,
  penalizeUserAction,
  setUserAccountStatusAction,
  type DeveloperUser
} from "@/app/desarrollador/actions";
import { DeveloperAboutEditor } from "@/components/DeveloperAboutEditor";

export function DeveloperPanel() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<DeveloperUser[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    canDevelopAction().then((canDevelop) => {
      setAllowed(canDevelop);
      if (canDevelop) void refreshUsers("");
    });
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return users;
    return users.filter((user) =>
      `${user.displayName} ${user.email} ${user.professionalRole}`.toLocaleLowerCase("es").includes(normalized)
    );
  }, [query, users]);

  async function refreshUsers(nextQuery = query) {
    const nextUsers = await listDeveloperUsersAction(nextQuery);
    setUsers(nextUsers);
  }

  function searchUsers() {
    startTransition(async () => {
      await refreshUsers(query);
    });
  }

  function toggleBlock(user: DeveloperUser) {
    setMessage("");
    startTransition(async () => {
      const nextStatus = user.status === "active" ? "blocked" : "active";
      const result = await setUserAccountStatusAction(user.id, nextStatus);
      setMessage(result.message);
      if (result.ok) await refreshUsers();
    });
  }

  function penalize(user: DeveloperUser) {
    setMessage("");
    startTransition(async () => {
      const result = await penalizeUserAction(user.id, 25);
      setMessage(result.message);
      if (result.ok) await refreshUsers();
    });
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
        <div className="action-row">
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario" />
          <button className="button secondary" type="button" onClick={searchUsers} disabled={isPending}>
            <Search size={16} /> Buscar
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>XP</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.displayName}</strong>
                  <p className="muted">{user.email}</p>
                </td>
                <td>
                  <span className="badge">{user.platformRole}</span>
                  <p className="muted">{user.professionalRole}</p>
                </td>
                <td>{user.status}</td>
                <td>{user.xp}</td>
                <td>
                  <div className="action-row">
                    <button className="button secondary" type="button" onClick={() => toggleBlock(user)} disabled={isPending}>
                      {user.status === "active" ? "Bloquear" : "Reactivar"}
                    </button>
                    <button className="button danger" type="button" onClick={() => penalize(user)} disabled={isPending}>
                      <MinusCircle size={16} /> -25 XP
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredUsers.length ? <div className="empty-state">No hay usuarios con ese filtro.</div> : null}
        {message ? <div className="callout">{message}</div> : null}
      </section>
    </div>
  );
}
