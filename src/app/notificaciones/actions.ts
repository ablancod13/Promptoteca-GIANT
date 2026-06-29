"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export async function listNotificationsAction(): Promise<NotificationView[]> {
  const context = await getNotificationContext();
  if (!context.ok) return [];

  const { data, error } = await context.admin
    .from("notifications")
    .select("id,type,title,body,created_at,read_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    createdAt: String(row.created_at),
    read: Boolean(row.read_at)
  }));
}

export async function markAllNotificationsReadAction(): Promise<{ ok: boolean }> {
  const context = await getNotificationContext();
  if (!context.ok) return { ok: false };

  await context.admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", context.userId)
    .is("read_at", null);

  revalidatePath("/");
  return { ok: true };
}

export async function deleteNotificationAction(notificationId: string): Promise<{ ok: boolean }> {
  const context = await getNotificationContext();
  if (!context.ok) return { ok: false };

  await context.admin.from("notifications").delete().eq("id", notificationId).eq("user_id", context.userId);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteAllNotificationsAction(): Promise<{ ok: boolean }> {
  const context = await getNotificationContext();
  if (!context.ok) return { ok: false };

  await context.admin.from("notifications").delete().eq("user_id", context.userId);
  revalidatePath("/");
  return { ok: true };
}

async function getNotificationContext() {
  const server = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!server || !admin) return { ok: false as const };

  const { data } = await server.auth.getUser();
  if (!data.user) return { ok: false as const };

  return { ok: true as const, admin, userId: data.user.id };
}
