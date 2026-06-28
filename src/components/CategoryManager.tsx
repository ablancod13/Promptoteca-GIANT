"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AI_MODELS, RECOMMENDED_TOOLS, TAXONOMY_STORAGE_KEYS } from "@/lib/constants";

type TaxonomyKind = "categories" | "tools" | "models";

const LABELS: Record<TaxonomyKind, { title: string; badge: string; placeholder: string; remove: string }> = {
  categories: {
    title: "Categorías",
    badge: "Orden alfabético",
    placeholder: "Nueva categoría",
    remove: "Eliminar categoría"
  },
  tools: {
    title: "Herramientas recomendadas",
    badge: "Formulario Compartir",
    placeholder: "Nueva herramienta",
    remove: "Eliminar herramienta"
  },
  models: {
    title: "Modelos sugeridos",
    badge: "Opciones de autor",
    placeholder: "Nuevo modelo",
    remove: "Eliminar modelo"
  }
};

export function CategoryManager({ initialCategories }: { initialCategories: string[] }) {
  const [items, setItems] = useState<Record<TaxonomyKind, string[]>>({
    categories: [],
    tools: [],
    models: []
  });
  const [drafts, setDrafts] = useState<Record<TaxonomyKind, string>>({
    categories: "",
    tools: "",
    models: ""
  });

  useEffect(() => {
    setItems({
      categories: loadList(TAXONOMY_STORAGE_KEYS.categories, initialCategories),
      tools: loadList(TAXONOMY_STORAGE_KEYS.tools, [...RECOMMENDED_TOOLS]),
      models: loadList(TAXONOMY_STORAGE_KEYS.models, [...AI_MODELS])
    });
  }, [initialCategories]);

  const ordered = useMemo(
    () => ({
      categories: [...items.categories].sort((a, b) => a.localeCompare(b, "es")),
      tools: [...items.tools].sort((a, b) => a.localeCompare(b, "es")),
      models: [...items.models].sort((a, b) => a.localeCompare(b, "es"))
    }),
    [items]
  );

  function persist(kind: TaxonomyKind, next: string[]) {
    const unique = [...new Set(next.map((item) => item.trim()).filter(Boolean))];
    setItems((current) => ({ ...current, [kind]: unique }));
    window.localStorage.setItem(TAXONOMY_STORAGE_KEYS[kind], JSON.stringify(unique));
  }

  function addItem(kind: TaxonomyKind) {
    const value = drafts[kind].trim();
    if (!value || items[kind].includes(value)) return;
    persist(kind, [...items[kind], value]);
    setDrafts((current) => ({ ...current, [kind]: "" }));
  }

  return (
    <section className="table-panel stack">
      <div className="section-head compact">
        <h2>Taxonomía editable</h2>
        <span className="badge">Moderación</span>
      </div>
      <div className="grid three taxonomy-grid">
        {(Object.keys(LABELS) as TaxonomyKind[]).map((kind) => {
          const label = LABELS[kind];
          return (
            <div className="taxonomy-box" key={kind}>
              <div className="section-head compact">
                <h3>{label.title}</h3>
                <span className="badge">{label.badge}</span>
              </div>
              <div className="action-row">
                <input
                  className="input"
                  value={drafts[kind]}
                  onChange={(event) => setDrafts((current) => ({ ...current, [kind]: event.target.value }))}
                  placeholder={label.placeholder}
                />
                <button className="button primary" type="button" onClick={() => addItem(kind)}>
                  <Plus size={16} /> Añadir
                </button>
              </div>
              <div className="badge-row taxonomy-list">
                {ordered[kind].map((item) => (
                  <span className="badge" key={item}>
                    {item}
                    <button
                      className="chip-remove"
                      type="button"
                      title={label.remove}
                      onClick={() => persist(kind, items[kind].filter((current) => current !== item))}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function loadList(key: string, fallback: string[]) {
  const stored = window.localStorage.getItem(key);
  return stored ? (JSON.parse(stored) as string[]) : fallback;
}
