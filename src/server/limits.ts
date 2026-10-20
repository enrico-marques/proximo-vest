import type { Plan, PlanAudience, Prisma, UsageMetric } from "@/generated/prisma/client";
import { planLimitLabel, type PlanLimitColumn } from "@/lib/plan-labels";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/server/auth/define-route";
import { resolvePlan } from "@/server/subscription";

type Db = Prisma.TransactionClient | typeof prisma;


// How each metered action maps onto the plan. Plans themselves are data; only the kinds of
// limit are code, because each one needs enforcement at the place the action happens.
export const METRICS: Record<UsageMetric, { audience: PlanAudience; column: PlanLimitColumn; window: "month" | "day" }> =
  {
    ESSAY_CORRECTION: { audience: "STUDENT", column: "essayCreditsPerMonth", window: "month" },
    TEACHER_LIST: { audience: "TEACHER", column: "listsPerMonth", window: "month" },
    QUESTION_ANSWER: { audience: "STUDENT", column: "questionsPerDay", window: "day" },
  };

// Periods follow Brazilian civil time so a "day" or "month" resets when users expect it to.
const PERIOD_TIME_ZONE = "America/Sao_Paulo";

export function usagePeriod(metric: UsageMetric, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PERIOD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const month = `${get("year")}-${get("month")}`;
  return METRICS[metric].window === "day" ? `${month}-${get("day")}` : month;
}

export function planLimit(plan: Pick<Plan, PlanLimitColumn> | null, metric: UsageMetric) {
  // No plan configured for the audience means nothing is included.
  return plan ? plan[METRICS[metric].column] : 0;
}

export class LimitExceededError extends HttpError {
  constructor(
    readonly metric: UsageMetric,
    readonly limit: number,
  ) {
    super(
      403,
      limit === 0
        ? "Seu plano não inclui este recurso."
        : `Você atingiu o limite do seu plano (${planLimitLabel(METRICS[metric].column).toLowerCase()}: ${limit}).`,
    );
    this.name = "LimitExceededError";
  }
}

/**
 * Records one use of a metered action, or throws LimitExceededError when the user's plan
 * does not allow it. Pass the transaction client of the action itself so a failed action
 * does not spend the user's quota.
 */
export async function consumeUsage(userId: string, metric: UsageMetric, db: Db = prisma, now = new Date()) {
  const plan = await resolvePlan(userId, METRICS[metric].audience, db, now);
  const limit = planLimit(plan, metric);
  if (limit === 0) throw new LimitExceededError(metric, 0);

  const key = { userId, metric, period: usagePeriod(metric, now) };

  if (limit === null) {
    await db.usageCounter.upsert({
      where: { userId_metric_period: key },
      create: { ...key, count: 1 },
      update: { count: { increment: 1 } },
    });
    return;
  }

  await db.usageCounter.upsert({
    where: { userId_metric_period: key },
    create: { ...key, count: 0 },
    update: {},
  });
  // The conditional increment is atomic, so concurrent requests cannot exceed the limit.
  const { count } = await db.usageCounter.updateMany({
    where: { ...key, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  if (count === 0) throw new LimitExceededError(metric, limit);
}

export type UsageSummary = { metric: UsageMetric; label: string; used: number; limit: number | null };

/** Current usage for every metric of an audience, for display only. */
export async function getUsageSummary(userId: string, audience: PlanAudience, now = new Date()) {
  const metrics = (Object.keys(METRICS) as UsageMetric[]).filter((m) => METRICS[m].audience === audience);

  const [plan, counters] = await Promise.all([
    resolvePlan(userId, audience, prisma, now),
    prisma.usageCounter.findMany({
      where: { userId, OR: metrics.map((metric) => ({ metric, period: usagePeriod(metric, now) })) },
    }),
  ]);

  const usage: UsageSummary[] = metrics.map((metric) => ({
    metric,
    label: planLimitLabel(METRICS[metric].column),
    used: counters.find((c) => c.metric === metric)?.count ?? 0,
    limit: planLimit(plan, metric),
  }));
  return { plan, usage };
}
