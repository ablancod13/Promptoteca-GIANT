import type { Prompt } from "@/lib/types";

export function buildCcByCitation(prompt: Pick<Prompt, "author" | "title" | "version">, consultedAt = new Date()): string {
  const date = consultedAt.toISOString().slice(0, 10);
  return `Prompt tomado/adaptado de la Promptoteca GIANT-SEIMC. Autor/a: ${prompt.author.displayName}. Título: ${prompt.title}. Versión: ${prompt.version}. Fecha de consulta: ${date}. Licencia: CC BY 4.0.`;
}

export function getLicenseUrl(): string {
  return "https://creativecommons.org/licenses/by/4.0/";
}
