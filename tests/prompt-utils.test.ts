import { describe, expect, it } from "vitest";
import { applyPromptFilters, detectVariables, hydratePromptTemplate, slugify } from "@/lib/prompt-utils";
import { seedPrompts } from "@/lib/seed-data";

describe("prompt utilities", () => {
  it("detects bracket variables once and preserves order", () => {
    const variables = detectVariables("p1", "Actua como [rol] sobre [tema] para [rol].");

    expect(variables.map((variable) => variable.name)).toEqual(["rol", "tema"]);
    expect(variables[0]).toMatchObject({ token: "[rol]", order: 0, required: true });
  });

  it("hydrates prompt templates while leaving missing values visible", () => {
    const result = hydratePromptTemplate("Hola [nombre], revisa [tema].", { nombre: "Ana" });

    expect(result).toBe("Hola Ana, revisa [tema].");
  });

  it("normalizes Spanish-like titles into stable slugs", () => {
    expect(slugify("Lectura critica: articulo clinico")).toBe("lectura-critica-articulo-clinico");
  });

  it("filters by text, category and sort", () => {
    const results = applyPromptFilters(seedPrompts, {
      query: "antibiograma",
      category: "Microbiologia clinica",
      sort: "votados"
    });

    expect(results[0]?.slug).toBe("comentario-antibiograma");
  });
});
