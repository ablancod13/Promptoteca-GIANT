"use server";

import { revalidatePath } from "next/cache";
import { LEVELS, POINTS_BY_ACTION } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LibraryFolder {
  id: string;
  name: string;
  color: string;
}

export interface LibraryNote {
  promptId: string;
  note: string;
}

export interface LibraryPrivateVersion {
  id: string;
  promptId: string;
  title: string;
  text: string;
  createdAt: string;
  versionType: string;
}

export interface LibraryState {
  favoriteIds: string[];
  likedIds: string[];
  folders: LibraryFolder[];
  favoriteFolders: Record<string, string>;
  notes: Record<string, string>;
  privateVersions: Record<string, string>;
  savedTemplateVersions: LibraryPrivateVersion[];
}

type LibraryResult =
  | { ok: true; message: string; state: LibraryState }
  | { ok: false; message: string };

const DEFAULT_FOLDER_COLOR = "#017F88";
const EMPTY_STATE: LibraryState = {
  favoriteIds: [],
  likedIds: [],
  folders: [],
  favoriteFolders: {},
  notes: {},
  privateVersions: {},
  savedTemplateVersions: []
};

export async function getLibraryStateAction(): Promise<LibraryState> {
  const context = await getLibraryContext();
  if (!context.ok) return EMPTY_STATE;
  return loadLibraryState(context.admin, context.userId);
}

export async function createLibraryFolderAction(name: string, color = DEFAULT_FOLDER_COLOR): Promise<LibraryResult> {
  const context = await getLibraryContext();
  if (!context.ok) return context;

  const cleanName = name.trim().slice(0, 42);
  if (!cleanName) return { ok: false, message: "El nombre de la carpeta es obligatorio." };

  const { error } = await context.admin.from("folders").insert({
    user_id: context.userId,
    name: cleanName,
    color
  });

  if (error) return { ok: false, message: error.message.includes("duplicate") ? "Ya existe una carpeta con ese nombre." : error.message };

  await awardPointsOnce(context.admin, context.userId, "folder_created", POINTS_BY_ACTION.folder_created, `folder:${context.userId}:${cleanName}`);
  revalidatePath("/biblioteca");
  return { ok: true, message: "Carpeta creada.", state: await loadLibraryState(context.admin, context.userId) };
}

export async function updateLibraryFolderColorAction(folderId: string, color: string): Promise<LibraryResult> {
  const context = await getLibraryContext();
  if (!context.ok) return context;

  await context.admin.from("folders").update({ color }).eq("id", folderId).eq("user_id", context.userId);
  revalidatePath("/biblioteca");
  return { ok: true, message: "Color actualizado.", state: await loadLibraryState(context.admin, context.userId) };
}

export async function moveFavoriteToFolderAction(promptId: string, folderId: string | null): Promise<LibraryResult> {
  const context = await getLibraryContext();
  if (!context.ok) return context;

  await context.admin
    .from("favorites")
    .update({ folder_id: folderId || null })
    .eq("user_id", context.userId)
    .eq("prompt_id", promptId);

  revalidatePath("/biblioteca");
  return { ok: true, message: "Favorito movido.", state: await loadLibraryState(context.admin, context.userId) };
}

export async function removeLibraryFavoriteAction(promptId: string): Promise<LibraryResult> {
  const context = await getLibraryContext();
  if (!context.ok) return context;

  await context.admin.from("favorites").delete().eq("user_id", context.userId).eq("prompt_id", promptId);
  const favoritesCount = await countPromptRows(context.admin, "favorites", promptId);
  await context.admin.from("prompts").update({ favorites_count: favoritesCount }).eq("id", promptId);

  revalidatePath("/biblioteca");
  revalidatePath("/prompts");
  return { ok: true, message: "Eliminado de favoritos.", state: await loadLibraryState(context.admin, context.userId) };
}

export async function removeLibraryLikeAction(promptId: string): Promise<LibraryResult> {
  const context = await getLibraryContext();
  if (!context.ok) return context;

  await context.admin.from("likes").delete().eq("user_id", context.userId).eq("prompt_id", promptId);
  const likesCount = await countPromptRows(context.admin, "likes", promptId);
  await context.admin.from("prompts").update({ likes_count: likesCount }).eq("id", promptId);

  revalidatePath("/biblioteca");
  revalidatePath("/prompts");
  return { ok: true, message: "Me gusta eliminado.", state: await loadLibraryState(context.admin, context.userId) };
}

export async function savePrivateNoteAction(promptId: string, note: string): Promise<LibraryResult> {
  const context = await getLibraryContext();
  if (!context.ok) return context;

  const cleanNote = note.slice(0, 144);
  if (cleanNote.trim()) {
    await context.admin.from("private_notes").upsert(
      {
        user_id: context.userId,
        prompt_id: promptId,
        note: cleanNote
      },
      { onConflict: "user_id,prompt_id" }
    );
    await awardPointsOnce(context.admin, context.userId, "private_note_added", POINTS_BY_ACTION.private_note_added, `note:${context.userId}:${promptId}`);
  } else {
    await context.admin.from("private_notes").delete().eq("user_id", context.userId).eq("prompt_id", promptId);
  }

  revalidatePath("/biblioteca");
  return { ok: true, message: "Nota guardada.", state: await loadLibraryState(context.admin, context.userId) };
}

export async function savePrivatePromptVersionAction(promptId: string, title: string, text: string): Promise<LibraryResult> {
  const context = await getLibraryContext();
  if (!context.ok) return context;
  if (!text.trim()) return { ok: false, message: "La version privada no puede estar vacia." };

  const { data: existing } = await context.admin
    .from("custom_prompt_versions")
    .select("id")
    .eq("user_id", context.userId)
    .eq("original_prompt_id", promptId)
    .eq("version_type", "private_edit")
    .maybeSingle();

  if (existing?.id) {
    await context.admin
      .from("custom_prompt_versions")
      .update({ title, content: text, version_type: "private_edit" })
      .eq("id", existing.id);
  } else {
    await context.admin.from("custom_prompt_versions").insert({
      user_id: context.userId,
      original_prompt_id: promptId,
      title,
      content: text,
      variable_values: {},
      version_type: "private_edit"
    });
  }

  await awardPointsOnce(context.admin, context.userId, "custom_version_saved", POINTS_BY_ACTION.custom_version_saved, `private-version:${context.userId}:${promptId}`);
  revalidatePath("/biblioteca");
  return { ok: true, message: "Version privada guardada.", state: await loadLibraryState(context.admin, context.userId) };
}

export async function saveTemplateVersionAction(
  promptId: string,
  title: string,
  content: string,
  values: Record<string, string | string[]>
): Promise<{ ok: boolean; message: string }> {
  const context = await getLibraryContext();
  if (!context.ok) return { ok: false, message: context.message };

  await context.admin.from("custom_prompt_versions").insert({
    user_id: context.userId,
    original_prompt_id: promptId,
    title,
    content,
    variable_values: values,
    version_type: "template"
  });

  await awardPointsOnce(
    context.admin,
    context.userId,
    "custom_version_saved",
    POINTS_BY_ACTION.custom_version_saved,
    `template-version:${context.userId}:${promptId}:${Object.keys(values).join("|")}:${content.length}`
  );
  revalidatePath("/biblioteca");
  return { ok: true, message: "Version privada guardada en tu biblioteca." };
}

async function getLibraryContext() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return { ok: false as const, message: "Supabase no esta configurado." };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false as const, message: "Inicia sesion para usar tu biblioteca." };

  return { ok: true as const, admin, userId: data.user.id };
}

async function loadLibraryState(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userId: string): Promise<LibraryState> {
  const [favorites, likes, folders, notes, versions] = await Promise.all([
    admin.from("favorites").select("prompt_id,folder_id").eq("user_id", userId),
    admin.from("likes").select("prompt_id").eq("user_id", userId),
    admin.from("folders").select("id,name,color").eq("user_id", userId).order("created_at"),
    admin.from("private_notes").select("prompt_id,note").eq("user_id", userId),
    admin.from("custom_prompt_versions").select("id,original_prompt_id,title,content,created_at,version_type").eq("user_id", userId).order("created_at", { ascending: false })
  ]);

  const favoriteFolders: Record<string, string> = {};
  for (const favorite of favorites.data ?? []) {
    if (favorite.folder_id) favoriteFolders[String(favorite.prompt_id)] = String(favorite.folder_id);
  }

  const noteMap: Record<string, string> = {};
  for (const note of notes.data ?? []) {
    noteMap[String(note.prompt_id)] = String(note.note);
  }

  const privateVersions: Record<string, string> = {};
  const savedTemplateVersions: LibraryPrivateVersion[] = [];
  for (const version of versions.data ?? []) {
    const versionType = String(version.version_type ?? "template");
    const item = {
      id: String(version.id),
      promptId: String(version.original_prompt_id),
      title: String(version.title),
      text: String(version.content),
      createdAt: String(version.created_at),
      versionType
    };
    if (versionType === "private_edit") privateVersions[item.promptId] = item.text;
    else savedTemplateVersions.push(item);
  }

  return {
    favoriteIds: (favorites.data ?? []).map((favorite) => String(favorite.prompt_id)),
    likedIds: (likes.data ?? []).map((like) => String(like.prompt_id)),
    folders: (folders.data ?? []).map((folder) => ({
      id: String(folder.id),
      name: String(folder.name),
      color: String(folder.color ?? DEFAULT_FOLDER_COLOR)
    })),
    favoriteFolders,
    notes: noteMap,
    privateVersions,
    savedTemplateVersions
  };
}

async function countPromptRows(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, table: "likes" | "favorites", promptId: string) {
  const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq("prompt_id", promptId);
  return count ?? 0;
}

async function awardPointsOnce(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  action: string,
  points: number,
  idempotencyKey: string
) {
  const inserted = await admin
    .from("points_ledger")
    .insert({
      user_id: userId,
      action,
      points,
      origin: "system",
      idempotency_key: idempotencyKey
    })
    .select("id")
    .maybeSingle();

  if (inserted.error) return;

  const { data: profile } = await admin.from("profiles").select("points").eq("id", userId).single();
  const nextPoints = Number(profile?.points ?? 0) + points;
  await admin.from("profiles").update({ points: nextPoints, level: levelForPoints(nextPoints) }).eq("id", userId);
}

function levelForPoints(points: number) {
  return [...LEVELS].reverse().find((level) => points >= level.minXp)?.level ?? 1;
}
