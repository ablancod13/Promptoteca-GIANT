"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Edit3, Eye, Folder, FolderOpen, HeartOff, Plus, Save, Trash2 } from "lucide-react";
import type { Prompt } from "@/lib/types";

interface PrivateFolder {
  id: string;
  name: string;
}

interface SavedVersion {
  id: string;
  promptId: string;
  title: string;
  text: string;
  createdAt: string;
}

type FolderMap = Record<string, string>;
type FolderColorMap = Record<string, string>;
type NotesMap = Record<string, string>;
type VersionMap = Record<string, string>;

const FAVORITES_KEY = "giant_favorites";
const LIKES_KEY = "giant_likes";
const FOLDERS_KEY = "giant_private_folders";
const FOLDER_COLORS_KEY = "giant_private_folder_colors";
const FOLDER_MAP_KEY = "giant_favorite_folders";
const NOTES_KEY = "giant_private_notes";
const PRIVATE_VERSIONS_KEY = "giant_private_prompt_edits";
const UNFILED_ID = "sin-carpeta";
const FOLDER_COLORS = ["#017F88", "#EC490D", "#2563EB", "#16A34A", "#DC2626", "#7C3AED", "#CA8A04", "#475569"];

export function LibraryClient({ prompts }: { prompts: Prompt[] }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [folders, setFolders] = useState<PrivateFolder[]>([]);
  const [folderColors, setFolderColors] = useState<FolderColorMap>({});
  const [folderMap, setFolderMap] = useState<FolderMap>({});
  const [notes, setNotes] = useState<NotesMap>({});
  const [privateVersions, setPrivateVersions] = useState<VersionMap>({});
  const [savedTemplateVersions, setSavedTemplateVersions] = useState<SavedVersion[]>([]);
  const [newFolder, setNewFolder] = useState("");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [activeFolderId, setActiveFolderId] = useState<string>(UNFILED_ID);
  const [draggingPromptId, setDraggingPromptId] = useState<string | null>(null);

  useEffect(() => {
    const favorites = window.localStorage.getItem(FAVORITES_KEY);
    const likes = window.localStorage.getItem(LIKES_KEY);
    const storedFolders = window.localStorage.getItem(FOLDERS_KEY);
    const storedFolderColors = window.localStorage.getItem(FOLDER_COLORS_KEY);
    const storedFolderMap = window.localStorage.getItem(FOLDER_MAP_KEY);
    const storedNotes = window.localStorage.getItem(NOTES_KEY);
    const storedPrivateVersions = window.localStorage.getItem(PRIVATE_VERSIONS_KEY);
    const customVersions = window.localStorage.getItem("giant_custom_versions");
    const defaultFolders = [
      { id: "lectura", name: "Lectura crítica" },
      { id: "proa", name: "PROA" }
    ];

    setFavoriteIds(favorites ? (JSON.parse(favorites) as string[]) : []);
    setLikedIds(likes ? (JSON.parse(likes) as string[]) : []);
    setFolders(
      (storedFolders ? (JSON.parse(storedFolders) as PrivateFolder[]) : defaultFolders).filter(
        (folder) => folder.id !== UNFILED_ID
      )
    );
    setFolderColors(
      storedFolderColors
        ? (JSON.parse(storedFolderColors) as FolderColorMap)
        : {
            lectura: "#017F88",
            proa: "#EC490D"
          }
    );
    setFolderMap(storedFolderMap ? (JSON.parse(storedFolderMap) as FolderMap) : {});
    setNotes(storedNotes ? (JSON.parse(storedNotes) as NotesMap) : {});
    setPrivateVersions(storedPrivateVersions ? (JSON.parse(storedPrivateVersions) as VersionMap) : {});
    setSavedTemplateVersions(customVersions ? (JSON.parse(customVersions) as SavedVersion[]) : []);
  }, []);

  const favorites = useMemo(() => prompts.filter((prompt) => favoriteIds.includes(prompt.id)), [favoriteIds, prompts]);
  const activeFolder = folders.find((folder) => folder.id === activeFolderId);
  const activePrompts = favorites.filter((prompt) => (folderMap[prompt.id] ?? UNFILED_ID) === activeFolderId);
  const unfiledCount = favorites.filter((prompt) => (folderMap[prompt.id] ?? UNFILED_ID) === UNFILED_ID).length;

  function persistFolders(next: PrivateFolder[]) {
    setFolders(next);
    window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
  }

  function persistFolderMap(next: FolderMap) {
    setFolderMap(next);
    window.localStorage.setItem(FOLDER_MAP_KEY, JSON.stringify(next));
  }

  function persistFolderColors(next: FolderColorMap) {
    setFolderColors(next);
    window.localStorage.setItem(FOLDER_COLORS_KEY, JSON.stringify(next));
  }

  function persistNotes(next: NotesMap) {
    setNotes(next);
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  }

  function persistPrivateVersions(next: VersionMap) {
    setPrivateVersions(next);
    window.localStorage.setItem(PRIVATE_VERSIONS_KEY, JSON.stringify(next));
  }

  function createFolder() {
    const name = newFolder.trim().slice(0, 42);
    if (!name) return;
    const folder = { id: `folder-${Date.now()}`, name };
    persistFolders([...folders, folder]);
    persistFolderColors({ ...folderColors, [folder.id]: FOLDER_COLORS[folders.length % FOLDER_COLORS.length] });
    setActiveFolderId(folder.id);
    setNewFolder("");
  }

  function removeFavorite(promptId: string) {
    const next = favoriteIds.filter((id) => id !== promptId);
    setFavoriteIds(next);
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    const nextMap = { ...folderMap };
    delete nextMap[promptId];
    persistFolderMap(nextMap);
  }

  function removeLike(promptId: string) {
    const next = likedIds.filter((id) => id !== promptId);
    setLikedIds(next);
    window.localStorage.setItem(LIKES_KEY, JSON.stringify(next));
  }

  function movePrompt(promptId: string, folderId: string) {
    if (!promptId) return;
    persistFolderMap({ ...folderMap, [promptId]: folderId });
    setActiveFolderId(folderId);
    setDraggingPromptId(null);
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
    persistNotes({ ...notes, [promptId]: value.slice(0, 144) });
  }

  function savePrivateVersion(promptId: string, value: string) {
    persistPrivateVersions({ ...privateVersions, [promptId]: value });
    setEditingPromptId(null);
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
            placeholder="Nota solo visible para ti"
          />
        </label>
        {editingPromptId === prompt.id ? (
          <label className="field">
            <span>Versión privada</span>
            <textarea
              className="textarea private-edit"
              defaultValue={versionText}
              onBlur={(event) => savePrivateVersion(prompt.id, event.target.value)}
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
          <span className="badge">Arrastra fichas</span>
        </div>
        <div className="action-row">
          <input className="input" value={newFolder} onChange={(event) => setNewFolder(event.target.value)} placeholder="Nueva carpeta" />
          <button className="button primary" type="button" onClick={createFolder}>
            <Plus size={16} /> Crear
          </button>
        </div>
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
              color={folderColors[folder.id] ?? FOLDER_COLORS[0]}
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
                  onClick={() => persistFolderColors({ ...folderColors, [activeFolderId]: color })}
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
