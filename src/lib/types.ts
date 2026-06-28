export type PlatformRole = "visitor" | "registered" | "moderator_candidate" | "moderator" | "admin" | "developer";

export type ReviewStatus = "pending" | "approved" | "changes_requested" | "rejected" | "archived" | "hidden";

export type Difficulty = "principiante" | "intermedio" | "avanzado";

export type VariableFieldType = "text" | "textarea" | "select" | "multiselect" | "number" | "date";

export type PromptTool =
  | "ChatGPT"
  | "Codex"
  | "Claude"
  | "Gemini"
  | "Microsoft Copilot"
  | "Perplexity"
  | "NotebookLM"
  | "Elicit"
  | "Consensus"
  | "Scite"
  | "Herramienta local"
  | "Otro";

export interface PromptVariable {
  id: string;
  promptId: string;
  name: string;
  token: string;
  type: VariableFieldType;
  options: string[];
  required: boolean;
  helpText?: string;
  defaultValue?: string;
  order: number;
}

export interface PromptAuthor {
  id: string;
  displayName: string;
  role: string;
  country: string;
  institution?: string;
  level: number;
}

export interface Prompt {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  objective: string;
  context: string;
  author: PromptAuthor;
  category: string;
  secondaryCategories: string[];
  tools: PromptTool[];
  recommendedModel?: string;
  intelligenceLevel?: string;
  language: string;
  bestLanguage: string;
  difficulty: Difficulty;
  tags: string[];
  reviewStatus: ReviewStatus;
  experimental: boolean;
  validatedByGiant: boolean;
  giantQualityScore?: number;
  likes: number;
  favorites: number;
  copies: number;
  templateUses: number;
  timeSavedMinutes: number;
  publishedAt: string;
  updatedAt: string;
  version: number;
  variables: PromptVariable[];
  limitations: string;
  misuseRisks: string;
  references: string[];
  license: "CC BY 4.0";
}

export interface PromptFilters {
  query?: string;
  category?: string;
  tool?: string;
  language?: string;
  difficulty?: Difficulty | "todas";
  validatedOnly?: boolean;
  experimentalOnly?: boolean;
  pendingOnly?: boolean;
  author?: string;
  sort?: "recientes" | "votados" | "guardados" | "copiados" | "calidad";
}

export interface AnalyticsEvent {
  type:
    | "registro"
    | "login"
    | "apertura_prompt"
    | "bloqueo_segundo_prompt"
    | "copia_prompt"
    | "uso_plantilla"
    | "favorito"
    | "carpeta"
    | "nota_privada"
    | "prompt_subido"
    | "prompt_revisado"
    | "like"
    | "busqueda"
    | "filtro"
    | "tiempo_permanencia";
  promptId?: string;
  metadata?: Record<string, unknown>;
}

export interface Level {
  level: number;
  minXp: number;
  maxXp: number | null;
  name: string;
}

export interface PointEvent {
  id: string;
  userId: string;
  action: string;
  points: number;
  promptId?: string;
  createdAt: string;
  idempotencyKey?: string;
}
