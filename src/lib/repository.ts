import { INITIAL_CATEGORIES } from "@/lib/constants";
import { applyPromptFilters } from "@/lib/prompt-utils";
import { seedPrompts } from "@/lib/seed-data";
import type { Prompt, PromptFilters } from "@/lib/types";

export async function listPrompts(filters?: PromptFilters): Promise<Prompt[]> {
  return applyPromptFilters(seedPrompts, filters);
}

export async function getPromptBySlug(slug: string): Promise<Prompt | null> {
  return seedPrompts.find((prompt) => prompt.slug === slug) ?? null;
}

export async function getPromptsByCategory(category: string): Promise<Prompt[]> {
  return applyPromptFilters(seedPrompts, { category, sort: "recientes" });
}

export async function getCategorySummary(): Promise<Array<{ name: string; count: number }>> {
  return [...INITIAL_CATEGORIES].sort((a, b) => a.localeCompare(b, "es")).map((name) => ({
    name,
    count: seedPrompts.filter((prompt) => prompt.category === name || prompt.secondaryCategories.includes(name)).length
  })).filter((category) => category.count > 0);
}

export async function getHomeStats() {
  return {
    totalPrompts: seedPrompts.length,
    publishedThisMonth: seedPrompts.filter((prompt) => prompt.publishedAt.startsWith("2026-06")).length,
    pendingReview: seedPrompts.filter((prompt) => prompt.reviewStatus === "pending").length,
    validatedByGiant: seedPrompts.filter((prompt) => prompt.validatedByGiant).length,
    totalCopies: seedPrompts.reduce((sum, prompt) => sum + prompt.copies, 0),
    totalFavorites: seedPrompts.reduce((sum, prompt) => sum + prompt.favorites, 0),
    customVersions: seedPrompts.reduce((sum, prompt) => sum + prompt.templateUses, 0),
    topCategory: "Lectura critica",
    mostSaved: [...seedPrompts].sort((a, b) => b.favorites - a.favorites)[0],
    mostCopied: [...seedPrompts].sort((a, b) => b.copies - a.copies)[0],
    mostLiked: [...seedPrompts].sort((a, b) => b.likes - a.likes)[0]
  };
}

export async function getRankings() {
  return {
    weekly: [...seedPrompts].sort((a, b) => b.likes - a.likes).slice(0, 5),
    monthly: [...seedPrompts].sort((a, b) => b.copies + b.favorites - (a.copies + a.favorites)).slice(0, 5),
    validated: seedPrompts.filter((prompt) => prompt.validatedByGiant).slice(0, 5),
    microbiology: seedPrompts
      .filter((prompt) => prompt.category === "Microbiologia clinica" || prompt.secondaryCategories.includes("Microbiologia clinica"))
      .sort((a, b) => b.likes - a.likes),
    infectiousDiseases: seedPrompts
      .filter((prompt) => prompt.category === "Enfermedades infecciosas" || prompt.secondaryCategories.includes("Enfermedades infecciosas"))
      .sort((a, b) => b.likes - a.likes)
  };
}
