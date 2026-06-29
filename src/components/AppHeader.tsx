"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, BookOpen, Code2, Library, Search, ShieldCheck, Trash2, Upload, UserRound, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { getCurrentProfileAction } from "@/app/auth/actions";
import {
  deleteAllNotificationsAction,
  deleteNotificationAction,
  listNotificationsAction,
  markAllNotificationsReadAction,
  type NotificationView
} from "@/app/notificaciones/actions";
import { canDevelop, canModerate, getLocalUser, saveLocalUser, type LocalUser } from "@/lib/local-user";
import { LevelAvatar } from "@/components/LevelAvatar";

export function AppHeader() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationView[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setUser(getLocalUser());
    getCurrentProfileAction().then((remoteUser) => {
      if (!remoteUser) return;
      saveLocalUser(remoteUser);
      setUser(remoteUser);
    });
    void refreshNotifications();

    const refresh = () => setUser(getLocalUser());
    window.addEventListener("giant:user-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("giant:user-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const hasUnread = notifications.some((item) => !item.read);

  async function refreshNotifications() {
    const items = await listNotificationsAction();
    setNotifications(items);
  }

  function toggleNotifications() {
    const nextOpen = !openNotifications;
    setOpenNotifications(nextOpen);
    if (nextOpen) {
      startTransition(async () => {
        await markAllNotificationsReadAction();
        setNotifications((current) => current.map((item) => ({ ...item, read: true })));
        await refreshNotifications();
      });
    }
  }

  function deleteOne(notificationId: string) {
    startTransition(async () => {
      const result = await deleteNotificationAction(notificationId);
      if (result.ok) setNotifications((current) => current.filter((item) => item.id !== notificationId));
    });
  }

  function deleteAll() {
    startTransition(async () => {
      const result = await deleteAllNotificationsAction();
      if (result.ok) setNotifications([]);
    });
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label="Promptoteca GIANT">
          <Image src="/giant-logo.png" alt="" width={150} height={82} priority />
          <span>Promptoteca GIANT</span>
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
                  onClick={toggleNotifications}
                >
                  <Bell size={18} fill={hasUnread ? "currentColor" : "none"} />
                </button>
                {openNotifications ? (
                  <div className="notification-menu">
                    <div className="notification-menu-head">
                      <strong>Notificaciones</strong>
                      {notifications.length ? (
                        <button className="chip-remove" type="button" onClick={deleteAll} disabled={isPending} title="Eliminar todas">
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                    {notifications.length ? (
                      notifications.map((item) => (
                        <article className="notification-item" key={item.id}>
                          <div>
                            <strong>{item.title}</strong>
                            <span>{item.body}</span>
                            <small>{new Date(item.createdAt).toLocaleString("es-ES")}</small>
                          </div>
                          <button className="chip-remove" type="button" onClick={() => deleteOne(item.id)} disabled={isPending} title="Eliminar">
                            <X size={14} />
                          </button>
                        </article>
                      ))
                    ) : (
                      <span className="muted">Sin notificaciones.</span>
                    )}
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
