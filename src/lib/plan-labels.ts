import type { PlanAudience } from "@/generated/prisma/browser";

export const PLAN_AUDIENCE_LABEL: Record<PlanAudience, string> = {
  STUDENT: "Aluno",
  TEACHER: "Professor",
  SCHOOL: "Escola",
};

export type PlanLimitColumn = "questionsPerDay" | "essayCreditsPerMonth" | "listsPerMonth";

// Display order and wording of each limit column, grouped by the audience it applies to.
export const PLAN_LIMITS: { column: PlanLimitColumn; audience: PlanAudience; label: string }[] = [
  { column: "questionsPerDay", audience: "STUDENT", label: "Questões por dia" },
  { column: "essayCreditsPerMonth", audience: "STUDENT", label: "Redações corrigidas por mês" },
  { column: "listsPerMonth", audience: "TEACHER", label: "Listas por mês" },
];

export function planLimitLabel(column: PlanLimitColumn) {
  return PLAN_LIMITS.find((l) => l.column === column)!.label;
}

/** null = unlimited, 0 = not included. */
export function formatLimit(limit: number | null) {
  if (limit === null) return "ilimitado";
  if (limit === 0) return "não incluso";
  return String(limit);
}

export function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
