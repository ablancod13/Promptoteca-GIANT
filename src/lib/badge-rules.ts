export const BADGE_RULES = [
  { value: "prompts_shared", label: "Prompts compartidos" },
  { value: "likes_given", label: "Me gusta dados" },
  { value: "likes_received", label: "Me gusta recibidos" },
  { value: "favorites_given", label: "Favoritos dados" },
  { value: "favorites_received", label: "Favoritos recibidos" },
  { value: "moderations_done", label: "Moderaciones realizadas" },
  { value: "reports_made", label: "Reportes realizados" },
  { value: "giant_validations_received", label: "Prompts validados por GIANT" }
] as const;

export type BadgeRuleKey = (typeof BADGE_RULES)[number]["value"];

export interface BadgeCriterion {
  rule: BadgeRuleKey;
  threshold: number;
}

export function parseBadgeCriterion(value: unknown): BadgeCriterion {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Partial<BadgeCriterion>;
      return normalizeCriterion(parsed);
    } catch {
      return { rule: "prompts_shared", threshold: 1 };
    }
  }

  if (value && typeof value === "object") {
    return normalizeCriterion(value as Partial<BadgeCriterion>);
  }

  return { rule: "prompts_shared", threshold: 1 };
}

export function formatBadgeCriterion(criterion: BadgeCriterion) {
  const label = BADGE_RULES.find((rule) => rule.value === criterion.rule)?.label ?? "Regla";
  return `${label}: ${criterion.threshold}`;
}

function normalizeCriterion(value: Partial<BadgeCriterion>): BadgeCriterion {
  const rule = BADGE_RULES.some((item) => item.value === value.rule) ? (value.rule as BadgeRuleKey) : "prompts_shared";
  const threshold = Math.max(1, Math.floor(Number(value.threshold ?? 1)));
  return { rule, threshold };
}
