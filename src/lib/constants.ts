import type { Level, PromptTool } from "@/lib/types";

export const INITIAL_CATEGORIES = [
  "Analisis de datos",
  "Bioinformatica",
  "Comunicacion cientifica",
  "Docencia",
  "Enfermedades infecciosas",
  "Gestion de correo electronico",
  "Herramientas digitales",
  "Investigacion",
  "Lectura critica",
  "Microbiologia clinica",
  "Presentaciones",
  "PROA",
  "Preparacion de sesiones clinicas",
  "Productividad clinica",
  "Productividad en laboratorio",
  "Protocolos y guias clinicas",
  "Redaccion cientifica",
  "Redes sociales profesionales",
  "Revision bibliografica",
  "Simulacion clinica"
] as const;

export const RECOMMENDED_TOOLS: PromptTool[] = [
  "ChatGPT",
  "Codex",
  "Claude",
  "Gemini",
  "Microsoft Copilot",
  "Perplexity",
  "NotebookLM",
  "Elicit",
  "Consensus",
  "Scite",
  "Herramienta local",
  "Otro"
];

export const PROFESSIONAL_ROLES = [
  "Enfermedades infecciosas",
  "Medicina interna",
  "Microbiología clínica",
  "Medicina preventiva",
  "Medicina intensiva",
  "Medicina familiar y comunitaria",
  "Pediatría",
  "Farmacia hospitalaria",
  "Enfermería",
  "Biología",
  "Biomedicina",
  "Bioinformática",
  "Informática",
  "Ingeniería de sistemas",
  "Investigación biomédica",
  "Estudiante",
  "Residente",
  "Otro"
];

export const LEVELS: Level[] = [
  { level: 1, minXp: 0, maxXp: 49, name: "Explorador/a GIANT" },
  { level: 2, minXp: 50, maxXp: 149, name: "Aprendiz de Prompt" },
  { level: 3, minXp: 150, maxXp: 349, name: "Contribuidor/a" },
  { level: 4, minXp: 350, maxXp: 749, name: "Arquitecto/a de Prompts" },
  { level: 5, minXp: 750, maxXp: 1499, name: "Referente GIANT" },
  { level: 6, minXp: 1500, maxXp: 2999, name: "Maestro/a Promptologo/a" },
  { level: 7, minXp: 3000, maxXp: 5999, name: "Leyenda GIANT" },
  { level: 8, minXp: 6000, maxXp: 9999, name: "Oraculo de IA Clinica" },
  { level: 9, minXp: 10000, maxXp: null, name: "Embajador/a GIANT" }
];

export const AI_MODELS = [
  "ChatGPT 5.5",
  "ChatGPT 5.4",
  "Codex 5.5",
  "Codex 5.4",
  "Claude Opus",
  "Claude Sonnet",
  "Claude Haiku",
  "Gemini Advanced",
  "Gemini Pro",
  "Microsoft Copilot",
  "Perplexity Sonar",
  "NotebookLM",
  "Elicit",
  "Consensus",
  "Scite",
  "Herramienta local",
  "Otro"
];

export const MODELS_BY_TOOL: Record<PromptTool, string[]> = {
  ChatGPT: ["ChatGPT 5.5", "ChatGPT 5.4"],
  Codex: ["Codex 5.5", "Codex 5.4"],
  Claude: ["Claude Opus", "Claude Sonnet", "Claude Haiku"],
  Gemini: ["Gemini Advanced", "Gemini Pro"],
  "Microsoft Copilot": ["Microsoft Copilot"],
  Perplexity: ["Perplexity Sonar"],
  NotebookLM: ["NotebookLM"],
  Elicit: ["Elicit"],
  Consensus: ["Consensus"],
  Scite: ["Scite"],
  "Herramienta local": ["Herramienta local"],
  Otro: ["Otro"]
};

export const TAXONOMY_STORAGE_KEYS = {
  categories: "giant_moderator_categories",
  tools: "giant_moderator_tools",
  models: "giant_moderator_models"
} as const;

export const INTELLIGENCE_LEVELS = [
  "Bajo",
  "Medio",
  "Alto",
  "Muy alto",
  "Extremadamente alto"
];

export const POINTS_BY_ACTION = {
  profile_completed: 5,
  first_prompt_opened: 2,
  first_prompt_copied: 2,
  favorite_saved: 1,
  folder_created: 2,
  private_note_added: 1,
  custom_version_saved: 2,
  prompt_submitted: 5,
  prompt_approved: 10,
  prompt_validated_giant: 20,
  prompt_featured: 25,
  weekly_top: 15,
  monthly_top: 30,
  unique_like_received: 1,
  prompt_saved_by_other: 2,
  edit_suggestion_approved: 8,
  relevant_error_validated: 6,
  category_approved: 10,
  moderator_review: 3,
  moderator_approval: 5,
  moderator_change_request: 4,
  moderator_rejection: 4,
  moderator_report_resolved: 5
} as const;
