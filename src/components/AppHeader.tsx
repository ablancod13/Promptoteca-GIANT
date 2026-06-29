"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, BookOpen, Code2, Library, Search, ShieldCheck, Upload, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCurrentProfileAction } from "@/app/auth/actions";
import { canDevelop, canModerate, getLocalUser, saveLocalUser, type LocalUser } from "@/lib/local-user";
import { LevelAvatar } from "@/components/LevelAvatar";

interface NotificationItem {
  id: string;
  title: string;
  createdAt: string;
  read?: boolean;
}

export function AppHeader() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [openNotifications, setOpenNotifications] = useState(false);

  useEffect(() => {
    setUser(getLocalUser());
    getCurrentProfileAction().then((remoteUser) => {
      if (!remoteUser) return;
      saveLocalUser(remoteUser);
      setUser(remoteUser);
    });
    const refresh = () => setUser(getLocalUser());
    window.addEventListener("giant:user-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("giant:user-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const notifications = useMemo<NotificationItem[]>(
    () => [
      { id: "n1", title: "Prompt aprobado", createdAt: "2026-06-24T08:00:00.000Z" },
      { id: "n2", title: "Prompt con 5 me gusta", createdAt: "2026-06-26T08:00:00.000Z" },
      { id: "n3", title: "Prompt modificado", createdAt: "2026-06-27T08:00:00.000Z" }
    ],
    []
  );
  const hasUnread = Boolean(user && notifications.some((item) => !user.notificationsReadAt || item.createdAt > user.notificationsReadAt));

  function readNotifications() {
    if (!user) return;
    const next = { ...user, notificationsReadAt: new Date().toISOString() };
    saveLocalUser(next);
    setUser(next);
    setOpenNotifications((current) => !current);
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="Promptoteca GIANT">
          <Image src="/giant-logo.png" alt="" width={150} height={82} priority />
          <span>
            Promptoteca GIANT
          </span>
        </Link>
        <nav className="nav" aria-label="Navegación principal">
          <Link className="nav-link" href="/prompts">
            <Search size={17} /> Explorar
          </Link>
          {user ? (
            <>
              <Link className="nav-link" href="/subir">
                <Upload size={17} /> Compartir
              </Link>
              <Link className="nav-link" href="/biblioteca">
                <Library size={17} /> Biblioteca
              </Link>
              {canModerate(user) ? (
                <Link className="nav-link" href="/moderacion">
                  <ShieldCheck size={17} /> Moderación
                </Link>
              ) : null}
              {canDevelop(user) ? (
                <Link className="nav-link" href="/desarrollador">
                  <Code2 size={17} /> Dev
                </Link>
              ) : null}
              <div className="notification-wrap">
                <button
                  className={`icon-button notification-button ${hasUnread ? "unread" : ""}`}
                  type="button"
                  title="Notificaciones"
                  onClick={readNotifications}
                >
                  <Bell size={18} fill={hasUnread ? "currentColor" : "none"} />
                </button>
                {openNotifications ? (
                  <div className="notification-menu">
                    {notifications.map((item) => (
                      <span key={item.id}>{item.title}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <Link className="button secondary" href="/perfil">
                <LevelAvatar xp={user.xp} size="sm" /> {user.displayName || user.name || "Perfil"}
              </Link>
            </>
          ) : (
            <>
              <Link className="button secondary" href="/login">
                <UserRound size={17} /> Entrar
              </Link>
              <Link className="button primary" href="/registro">
                <BookOpen size={17} /> Registro
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
