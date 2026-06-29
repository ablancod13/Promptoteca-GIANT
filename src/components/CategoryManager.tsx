"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  addTaxonomyItemAction,
  deactivateTaxonomyItemAction,
  type TaxonomyKind,
  type TaxonomyState
} from "@/app/moderacion/taxonomy-actions";

const LABELS: Record<TaxonomyKind, { title: string; badge: string; placeholder: string; remove: string }> = {
  categories: {
    title: "Categorías",
    badge: "Orden alfabético",
    placeholder: "Nueva categoría",
    remove: "Retirar categoría"
  },
  tools: {
    title: "Herramientas recomendadas",
    badge: "Formulario Compartir",
    placeholder: "Nueva herramienta",
    remove: "Retirar herramienta"
  },
  models: {
    title: "Modelos sugeridos",
    badge: "Opciones de autor",
    placeholder: "Nuevo modelo",
    remove: "Retirar modelo"
  }
};

export function CategoryManager({ initialState }: { initialState: TaxonomyState }) {
  const [items, setItems] = useState<TaxonomyState>(initialState);
  const [drafts, setDrafts] = useState<Record<TaxonomyKind, string>>({
    categories: "",
    tools: "",
    models: ""
  });
  const [modelTool, setModelTool] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const ordered = useMemo(
    () => ({
      categories: [...items.categories].sort(sortByName),
      tools: [...items.tools].sort(sortByName),
      models: [...items.models].sort(sortByName)
    }),
    [items]
  );

  function addItem(kind: TaxonomyKind) {
    const value = drafts[kind].trim();
    if (!value) return;

    setMessage("");
    startTransition(async () => {
      const result = await addTaxonomyItemAction(kind, value, kind === "models" ? modelTool : undefined);
      setMessage(result.message);
      if (result.ok && result.state) {
        setItems(result.state);
        setDrafts((current) => ({ ...current, [kind]: "" }));
        if (kind === "models") setModelTool("");
      }
    });
  }

  function removeItem(kind: TaxonomyKind, id: string) {
    setMessage("");
    startTransition(async () => {
      const result = await deactivateTaxonomyItemAction(kind, id);
      setMessage(result.message);
      if (result.ok && result.state) setItems(result.state);
    });
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
                <button className="button primary" type="button" onClick={() => addItem(kind)} disabled={isPending}>
                  <Plus size={16} /> Añadir
                </button>
              </div>
              {kind === "models" ? (
                <label className="field">
                  <span>Herramienta asociada</span>
                  <select className="select" value={modelTool} onChange={(event) => setModelTool(event.target.value)}>
                    <option value="">Sin asociación</option>
                    {ordered.tools.map((tool) => (
                      <option value={tool.name} key={tool.id}>
                        {tool.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="badge-row taxonomy-list">
                {ordered[kind].map((item) => (
                  <span className="badge" key={item.id}>
                    {item.name}
                    {kind === "models" && item.toolName ? <small> · {item.toolName}</small> : null}
                    <button className="chip-remove" type="button" title={label.remove} onClick={() => removeItem(kind, item.id)}>
                      <Trash2 size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {message ? <div className="callout">{message}</div> : null}
    </section>
  );
}

function sortByName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, "es");
}
