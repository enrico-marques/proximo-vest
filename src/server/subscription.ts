import { prisma } from "@/lib/prisma";
import type { Plan, Subscription } from "@/generated/prisma/client";

// Status como string union (banco guarda string)
export type SubscriptionStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELED"
  | "CANCEL_AT_PERIOD_END";

// Mesmos valores do enum BillingInterval no Prisma
export type BillingInterval = "MONTH" | "YEAR";

export type SubscriptionWithPlan = Subscription & {
  plan: Plan;
};

// --------------------------------------
// GET SUBSCRIPTION + PLAN
// --------------------------------------

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
}

// --------------------------------------
// CHECKS UTILS
// --------------------------------------

export function isActiveSubscription(
  sub?: { status: string; expiresAt: Date | null } | null
) {
  if (!sub) return false;

  const now = new Date();

  // Ativo normal
  if (sub.status === "ACTIVE") {
    if (sub.expiresAt && sub.expiresAt < now) return false;
    return true;
  }

  // Cancelada, mas ainda válida até o fim do período
  if (sub.status === "CANCEL_AT_PERIOD_END") {
    if (!sub.expiresAt) return true; // sem data, considera ativo
    return sub.expiresAt > now;
  }

  return false;
}

export function hasPlan(
  sub:
    | {
        status: string;
        planKey: string;
        expiresAt: Date | null;
      }
    | null
    | undefined,
  planKey: string
) {
  if (!sub) return false;
  return isActiveSubscription(sub) && sub.planKey === planKey;
}

// --------------------------------------
// UPSERT (CREATE OR UPDATE)
// --------------------------------------

type UpsertSubscriptionInput = {
  userId: string;
  planKey: string;
  status: SubscriptionStatus;
  expiresAt?: Date | null;
  billingInterval?: BillingInterval; // NOVO
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

export async function upsertSubscription(input: UpsertSubscriptionInput) {
  const { userId, ...data } = input;

  return prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      // se não vier nada, default MONTH (mesmo do Prisma)
      billingInterval: data.billingInterval ?? "MONTH",
      ...data,
    },
    update: {
      // não força billingInterval se não vier no update
      ...(data.billingInterval ? { billingInterval: data.billingInterval } : {}),
      ...data,
    },
  });
}

// --------------------------------------
// CANCEL SUBSCRIPTION (LOCAL)
// --------------------------------------

export async function cancelSubscriptionLocal(userId: string) {
  return prisma.subscription.update({
    where: { userId },
    data: {
      status: "CANCELED",
      expiresAt: new Date(),
    },
  });
}

// --------------------------------------
// GIVE FREE PLAN / MANUAL PLAN
// --------------------------------------

export async function giveFreePlan(
  userId: string,
  planKey: string,
  days: number,
  billingInterval: BillingInterval = "MONTH" // NOVO: default MONTH
) {
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  return upsertSubscription({
    userId,
    planKey,
    status: "ACTIVE",
    expiresAt,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    billingInterval,
  });
}

// --------------------------------------
// PLAN LIMITS (EX: REDAÇÕES / LISTAS POR MÊS)
// Use a chave do plano (plan.key)
// --------------------------------------

export type PlanLimits = {
  // aluno
  essayCreditsPerMonth: number;
  // professor
  listLimitPerMonth: number | null; // null = ilimitado
  unlimitedLists: boolean;
  // se quiser manter algo futuro
  unlimitedQuestions: boolean;
};

export function getPlanLimits(planKey?: string | null): PlanLimits {
  switch (planKey) {
    // ----------------------
    // ALUNO
    // ----------------------
    case "STUDENT_START":
      return {
        essayCreditsPerMonth: 1,
        listLimitPerMonth: 0,
        unlimitedLists: false,
        unlimitedQuestions: true,
      };

    case "STUDENT_PRO":
      return {
        essayCreditsPerMonth: 4,
        listLimitPerMonth: 0,
        unlimitedLists: false,
        unlimitedQuestions: true,
      };

    // ----------------------
    // PROFESSOR
    // ----------------------
    case "TEACHER_EDU":
      return {
        essayCreditsPerMonth: 0,
        listLimitPerMonth: 5, // 5 listas/simulados por mês
        unlimitedLists: false,
        unlimitedQuestions: true,
      };

    case "TEACHER_EDU_PRO":
      return {
        essayCreditsPerMonth: 0,
        listLimitPerMonth: null, // ilimitado
        unlimitedLists: true,
        unlimitedQuestions: true,
      };

    // ----------------------
    // DEFAULT / SEM PLANO
    // ----------------------
    default:
      return {
        essayCreditsPerMonth: 0,
        listLimitPerMonth: 0,
        unlimitedLists: false,
        unlimitedQuestions: false,
      };
  }
}
