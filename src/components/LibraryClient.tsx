"use client";

import { type CSSProperties, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Edit3, Eye, Folder, FolderOpen, HeartOff, Plus, Save, Trash2 } from "lucide-react";
import {
  createLibraryFolderAction,
  getLibraryStateAction,
  moveFavoriteToFolderAction,
  removeLibraryFavoriteAction,
  removeLibraryLikeAction,
  savePrivateNoteAction,
  savePrivatePromptVersionAction,
  updateLibraryFolderColorAction,
  type LibraryFolder,
  type LibraryPrivateVersion,
  type LibraryState
} from "@/app/biblioteca/actions";
import type { Prompt } from "@/lib/types";

type FolderMap = Record<string, string>;
type FolderColorMap = Record<string, string>;
type NotesMap = Record<string, string>;
type VersionMap = Record<string, string>;

const UNFILED_ID = "sin-carpeta";
const FOLDER_COLORS = ["#017F88", "#EC490D", "#2563EB", "#16A34A", "#DC2626", "#7C3AED", "#CA8A04", "#475569"];

const EMPTY_LIBRARY: LibraryState = {
  favoriteIds: [],
  likedIds: [],
  folders: [],
  favoriteFolders: {},
  notes: {},
  privateVersions: {},
  savedTemplateVersions: []
};

export function LibraryClient({ prompts }: { prompts: Prompt[] }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [folderColors, setFolderColors] = useState<FolderColorMap>({});
  const [folderMap, setFolderMap] = useState<FolderMap>({});
  const [notes, setNotes] = useState<NotesMap>({});
  const [privateVersions, setPrivateVersions] = useState<VersionMap>({});
  const [savedTemplateVersions, setSavedTemplateVersions] = useState<LibraryPrivateVersion[]>([]);
  const [newFolder, setNewFolder] = useState("");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [activeFolderId, setActiveFolderId] = useState<string>(UNFILED_ID);
  const [draggingPromptId, setDraggingPromptId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getLibraryStateAction().then((state) => {
      if (cancelled) return;
      applyLibraryState(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const favorites = useMemo(() => prompts.filter((prompt) => favoriteIds.includes(prompt.id)), [favoriteIds, prompts]);
  const activeFolder = folders.find((folder) => folder.id === activeFolderId);
  const activePrompts = favorites.filter((prompt) => (folderMap[prompt.id] ?? UNFILED_ID) === activeFolderId);
  const unfiledCount = favorites.filter((prompt) => (folderMap[prompt.id] ?? UNFILED_ID) === UNFILED_ID).length;

  function applyLibraryState(state: LibraryState = EMPTY_LIBRARY) {
    setFavoriteIds(state.favoriteIds);
    setLikedIds(state.likedIds);
    setFolders(state.folders);
    setFolderColors(Object.fromEntries(state.folders.map((folder) => [folder.id, folder.color])));
    setFolderMap(state.favoriteFolders);
    setNotes(state.notes);
    setPrivateVersions(state.privateVersions);
    setSavedTemplateVersions(state.savedTemplateVersions);
  }

  function runLibraryAction(action: () => Promise<{ ok: boolean; message: string; state?: LibraryState }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok && result.state) applyLibraryState(result.state);
    });
  }

  function createFolder() {
    const name = newFolder.trim().slice(0, 42);
    if (!name) return;
    const color = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
    runLibraryAction(async () => {
      const result = await createLibraryFolderAction(name, color);
      if (result.ok) {
        setNewFolder("");
        const created = result.state.folders.find((folder) => folder.name === name);
        if (created) setActiveFolderId(created.id);
      }
      return result;
    });
  }

  function removeFavorite(promptId: string) {
    runLibraryAction(() => removeLibraryFavoriteAction(promptId));
  }

  function removeLike(promptId: string) {
    runLibraryAction(() => removeLibraryLikeAction(promptId));
  }

  function movePrompt(promptId: string, folderId: string) {
    if (!promptId) return;
    const nextFolderId = folderId === UNFILED_ID ? null : folderId;
    setFolderMap((current) => ({ ...current, [promptId]: folderId }));
    setActiveFolderId(folderId);
    setDraggingPromptId(null);
    runLibraryAction(() => moveFavoriteToFolderAction(promptId, nextFolderId));
  }

  function startPromptDrag(event: React.DragEvent<HTMLElement>, prompt: Prompt) {
    event.dataTransfer.setData("text/plain", prompt.id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingPromptId(prompt.id);

    const preview = document.createElement("div");
    preview.className = "drag-preview";
    preview.innerHTML = `<strong>${escapeHtml(prompt.title)}</strong><span>${escapeHtml(prompt.summary)}</span>`;
    document.body.appendChild(preview);
    event.dataTransfer.setDragImage(preview, 18, 18);
    window.setTimeout(() => preview.remove(), 0);
  }

  function saveNote(promptId: string, value: string) {
    const nextValue = value.slice(0, 144);
    setNotes((current) => ({ ...current, [promptId]: nextValue }));
  }

  function persistNote(promptId: string) {
    runLibraryAction(() => savePrivateNoteAction(promptId, notes[promptId] ?? ""));
  }

  function savePrivateVersion(prompt: Prompt, value: string) {
    const nextValue = value.trim();
    setPrivateVersions((current) => ({ ...current, [prompt.id]: nextValue }));
    setEditingPromptId(null);
    runLibraryAction(() => savePrivatePromptVersionAction(prompt.id, prompt.title, nextValue));
  }

  function changeFolderColor(folderId: string, color: string) {
    setFolderColors((current) => ({ ...current, [folderId]: color }));
    runLibraryAction(() => updateLibraryFolderColorAction(folderId, color));
  }

  function renderPromptCard(prompt: Prompt) {
    const versionText = privateVersions[prompt.id] ?? prompt.content;
    const useOriginal = showOriginal[prompt.id];

    return (
      <article
        className="library-card"
        key={prompt.id}
        draggable
        onDragStart={(event) => startPromptDrag(event, prompt)}
        onDragEnd={() => setDraggingPromptId(null)}
      >
        <div className="section-head compact">
          <Link href={`/prompts/${prompt.slug}`}>
            <strong>{prompt.title}</strong>
          </Link>
          <button className="icon-button" title="Quitar de favoritos" type="button" onClick={() => removeFavorite(prompt.id)}>
            <HeartOff size={17} />
          </button>
        </div>
        <p className="muted">{prompt.summary}</p>
        <label className="field">
          <span>Nota privada ({(notes[prompt.id] ?? "").length}/144)</span>
          <textarea
            className="textarea note-input"
            maxLength={144}
            value={notes[prompt.id] ?? ""}
            onChange={(event) => saveNote(prompt.id, event.target.value)}
            onBlur={() => persistNote(prompt.id)}
            placeholder="Nota solo visible para ti"
          />
        </label>
        {editingPromptId === prompt.id ? (
          <label className="field">
            <span>Versión privada</span>
            <textarea
              className="textarea private-edit"
              defaultValue={versionText}
              onBlur={(event) => savePrivateVersion(prompt, event.target.value)}
            />
          </label>
        ) : privateVersions[prompt.id] ? (
          <pre className="prompt-text compact-text">{useOriginal ? prompt.content : privateVersions[prompt.id]}</pre>
        ) : null}
        <div className="action-row">
          <button className="button secondary" type="button" onClick={() => setEditingPromptId(prompt.id)}>
            <Edit3 size={16} /> Editar privado
          </button>
          {privateVersions[prompt.id] ? (
            <button
              className="button secondary"
              type="button"
              onClick={() => setShowOriginal((current) => ({ ...current, [prompt.id]: !current[prompt.id] }))}
            >
              <Eye size={16} /> {useOriginal ? "Ver versión privada" : "Ver original"}
            </button>
          ) : null}
          {likedIds.includes(prompt.id) ? (
            <button className="button danger" type="button" onClick={() => removeLike(prompt.id)}>
              <Trash2 size={16} /> Quitar me gusta
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  function renderFavoriteRow(prompt: Prompt) {
    return (
      <article
        className="favorite-row"
        key={prompt.id}
        draggable
        onDragStart={(event) => startPromptDrag(event, prompt)}
        onDragEnd={() => setDraggingPromptId(null)}
      >
        <Link href={`/prompts/${prompt.slug}`}>
          <strong>{prompt.title}</strong>
          <span>{prompt.summary}</span>
        </Link>
        <button className="icon-button" title="Quitar de favoritos" type="button" onClick={() => removeFavorite(prompt.id)}>
          <HeartOff size={17} />
        </button>
      </article>
    );
  }

  return (
    <div className={`library-layout ${draggingPromptId ? "dragging" : ""}`}>
      <section className="table-panel stack">
        <div className="section-head compact">
          <h2>Favoritos</h2>
          <span className="badge">{favorites.length}</span>
        </div>
        {favorites.length ? favorites.map(renderFavoriteRow) : <div className="empty-state">Todavía no hay favoritos.</div>}
      </section>
      <section className="table-panel stack">
        <div className="section-head compact">
          <h2>Carpetas privadas</h2>
          <span className="badge">{isPending ? "Guardando..." : "Arrastra fichas"}</span>
        </div>
        <div className="action-row">
          <input className="input" value={newFolder} onChange={(event) => setNewFolder(event.target.value)} placeholder="Nueva carpeta" />
          <button className="button primary" type="button" onClick={createFolder} disabled={isPending}>
            <Plus size={16} /> Crear
          </button>
        </div>
        {message ? <div className="callout">{message}</div> : null}
        <div className="folder-shelf">
          <FolderTile
            id={UNFILED_ID}
            name="Sin carpeta"
            count={unfiledCount}
            active={activeFolderId === UNFILED_ID}
            color="#6B7280"
            isDragging={Boolean(draggingPromptId)}
            onOpen={setActiveFolderId}
            onMove={movePrompt}
          />
          {folders.map((folder) => (
            <FolderTile
              id={folder.id}
              name={folder.name}
              count={favorites.filter((prompt) => folderMap[prompt.id] === folder.id).length}
              active={activeFolderId === folder.id}
              color={folderColors[folder.id] ?? folder.color ?? FOLDER_COLORS[0]}
              isDragging={Boolean(draggingPromptId)}
              onOpen={setActiveFolderId}
              onMove={movePrompt}
              key={folder.id}
            />
          ))}
        </div>
        <div
          className="folder-view"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => movePrompt(event.dataTransfer.getData("text/plain"), activeFolderId)}
        >
          <div className="section-head compact">
            <h3>{activeFolder?.name ?? "Sin carpeta"}</h3>
            <span className="badge">{activePrompts.length} prompts</span>
          </div>
          {activeFolderId !== UNFILED_ID ? (
            <div className="folder-color-picker" aria-label="Color de carpeta">
              {FOLDER_COLORS.map((color) => (
                <button
                  className={`color-swatch ${folderColors[activeFolderId] === color ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  key={color}
                  type="button"
                  title="Cambiar color"
                  onClick={() => changeFolderColor(activeFolderId, color)}
                />
              ))}
            </div>
          ) : null}
          {activePrompts.length ? activePrompts.map(renderPromptCard) : <div className="empty-state">Arrastra un favorito aquí.</div>}
        </div>
        {savedTemplateVersions.length ? (
          <div className="stack">
            <h3>Plantillas guardadas</h3>
            {savedTemplateVersions.map((version) => (
              <article className="callout" key={version.id}>
                <strong>{version.title}</strong>
                <span className="muted">{new Date(version.createdAt).toLocaleDateString("es-ES")}</span>
                <button className="button secondary" type="button">
                  <Save size={16} /> Guardada
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function FolderTile({
  id,
  name,
  count,
  active,
  color,
  isDragging,
  onOpen,
  onMove
}: {
  id: string;
  name: string;
  count: number;
  active: boolean;
  color: string;
  isDragging: boolean;
  onOpen: (id: string) => void;
  onMove: (promptId: string, folderId: string) => void;
}) {
  return (
    <button
      className={`folder-tile ${active ? "active" : ""} ${isDragging ? "drop-ready" : ""}`}
      style={{ "--folder-color": color } as CSSProperties}
      type="button"
      onClick={() => onOpen(id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onMove(event.dataTransfer.getData("text/plain"), id)}
    >
      {active ? <FolderOpen size={36} fill={color} /> : <Folder size={36} fill={color} />}
      <strong>{name}</strong>
      <span>{isDragging ? "Soltar aquí" : `${count} prompts`}</span>
    </button>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character] ?? character;
  });
}
