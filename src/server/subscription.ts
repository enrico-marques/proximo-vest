import type { Plan, PlanAudience, Prisma, Subscription, SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export type SubscriptionWithPlan = Subscription & { plan: Plan };

export function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
}

export function isActiveSubscription(
  sub: { status: SubscriptionStatus; expiresAt: Date | null } | null | undefined,
  now = new Date(),
) {
  if (!sub) return false;
  if (sub.status !== "ACTIVE" && sub.status !== "CANCEL_AT_PERIOD_END") return false;
  // Without an end date (e.g. a plan granted by an admin) access does not expire.
  return !sub.expiresAt || sub.expiresAt > now;
}

/**
 * The plan that governs a user for an audience: their subscription's plan while it is active
 * and sold to that audience, otherwise the audience's default plan (null if none is set).
 */
export async function resolvePlan(userId: string, audience: PlanAudience, db: Db = prisma, now = new Date()) {
  const [subscription, fallback] = await Promise.all([
    db.subscription.findUnique({ where: { userId }, include: { plan: true } }),
    db.plan.findFirst({ where: { audience, isDefault: true } }),
  ]);

  if (subscription && subscription.plan.audience === audience && isActiveSubscription(subscription, now)) {
    return subscription.plan;
  }
  return fallback;
}
