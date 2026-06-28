"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { ABOUT_CONTENT_KEY, DEFAULT_ABOUT_CONTENT, type AboutContent, type AboutPerson } from "@/lib/about-content";

export function DeveloperAboutEditor() {
  const [content, setContent] = useState<AboutContent>(DEFAULT_ABOUT_CONTENT);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(ABOUT_CONTENT_KEY);
    setContent(stored ? (JSON.parse(stored) as AboutContent) : DEFAULT_ABOUT_CONTENT);
  }, []);

  function patchContent<K extends keyof AboutContent>(key: K, value: AboutContent[K]) {
    setContent((current) => ({ ...current, [key]: value }));
  }

  function patchPerson(id: string, patch: Partial<AboutPerson>) {
    setContent((current) => ({
      ...current,
      people: current.people.map((person) => (person.id === id ? { ...person, ...patch } : person))
    }));
  }

  function addPerson() {
    setContent((current) => ({
      ...current,
      people: [
        ...current.people,
        {
          id: `person-${Date.now()}`,
          name: "Nueva persona",
          role: "Integrante",
          bio: ""
        }
      ]
    }));
  }

  function removePerson(id: string) {
    setContent((current) => ({
      ...current,
      people: current.people.filter((person) => person.id !== id)
    }));
  }

  async function uploadPhoto(id: string, file: File | null) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    patchPerson(id, { photoUrl: dataUrl });
  }

  function save() {
    window.localStorage.setItem(ABOUT_CONTENT_KEY, JSON.stringify(content));
    window.dispatchEvent(new CustomEvent("giant:about-updated"));
    setMessage("Contenido de Quiénes somos guardado.");
  }

  return (
    <section className="table-panel stack">
      <div className="section-head compact">
        <h2>Quiénes somos</h2>
        <span className="badge">Contenido público</span>
      </div>
      <label className="field">
        <span>Título</span>
        <input className="input" value={content.title} onChange={(event) => patchContent("title", event.target.value)} />
      </label>
      <label className="field">
        <span>Qué es GIANT</span>
        <textarea className="textarea" value={content.intro} onChange={(event) => patchContent("intro", event.target.value)} />
      </label>
      <label className="field">
        <span>Quiénes lo componen</span>
        <textarea className="textarea" value={content.composition} onChange={(event) => patchContent("composition", event.target.value)} />
      </label>
      <label className="field">
        <span>Creador</span>
        <textarea className="textarea" value={content.creator} onChange={(event) => patchContent("creator", event.target.value)} />
      </label>

      <div className="section-head compact">
        <h3>Personas y fotos</h3>
        <button className="button secondary" type="button" onClick={addPerson}>
          <Plus size={16} /> Añadir persona
        </button>
      </div>
      <div className="stack">
        {content.people.map((person) => (
          <article className="person-editor" key={person.id}>
            <div className="person-editor-photo">
              {person.photoUrl ? <img src={person.photoUrl} alt="" /> : <span>{person.name.slice(0, 1)}</span>}
              <label className="button secondary">
                <ImagePlus size={16} /> Foto
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => void uploadPhoto(person.id, event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div className="grid three">
              <label className="field">
                <span>Nombre</span>
                <input className="input" value={person.name} onChange={(event) => patchPerson(person.id, { name: event.target.value })} />
              </label>
              <label className="field">
                <span>Rol</span>
                <input className="input" value={person.role} onChange={(event) => patchPerson(person.id, { role: event.target.value })} />
              </label>
              <button className="button danger" type="button" onClick={() => removePerson(person.id)}>
                <Trash2 size={16} /> Eliminar
              </button>
            </div>
            <label className="field">
              <span>Descripción</span>
              <textarea className="textarea compact-area" value={person.bio} onChange={(event) => patchPerson(person.id, { bio: event.target.value })} />
            </label>
          </article>
        ))}
      </div>
      <button className="button primary" type="button" onClick={save}>
        <Save size={16} /> Guardar Quiénes somos
      </button>
      {message ? <div className="callout">{message}</div> : null}
    </section>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
