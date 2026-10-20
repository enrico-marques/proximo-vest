import { z } from "zod";

import { Prisma, type BillingInterval, type Plan } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/server/auth/define-route";

const price = z.number().nonnegative().nullable();
// null = unlimited, 0 = not included
const limit = z.number().int().nonnegative().nullable();
const stripePriceId = z
  .string()
  .trim()
  .regex(/^price_[A-Za-z0-9]+$/, "Use o ID do preço no Stripe (price_...).")
  .nullable()
  .or(z.literal("").transform(() => null));

export const planInputSchema = z.object({
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  audience: z.enum(["STUDENT", "TEACHER", "SCHOOL"]),
  monthlyPrice: price,
  yearlyPrice: price,
  stripePriceId,
  stripeYearlyPriceId: stripePriceId,
  essayCreditsPerMonth: limit,
  listsPerMonth: limit,
  questionsPerDay: limit,
  isDefault: z.boolean(),
  highlight: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});

export const planUpdateSchema = planInputSchema.partial();

export type PlanInput = z.infer<typeof planInputSchema>;
export type PlanUpdate = z.infer<typeof planUpdateSchema>;

const PLAN_ORDER = [{ audience: "asc" }, { sortOrder: "asc" }, { monthlyPrice: "asc" }] as const;

export function listPlans({ includeInactive = false } = {}) {
  return prisma.plan.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [...PLAN_ORDER],
  });
}

export function getPlan(id: string) {
  return prisma.plan.findUnique({ where: { id } });
}

// Stripe price ids are unique across plans; reusing one would make the webhook ambiguous.
function rethrowDuplicatePrice(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new HttpError(409, "Este Price ID do Stripe já está em outro plano.");
  }
  throw err;
}

export async function createPlan(input: PlanInput) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.plan.updateMany({
        where: { audience: input.audience, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.plan.create({ data: input });
  }).catch(rethrowDuplicatePrice);
}

export async function updatePlan(id: string, input: PlanUpdate) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.plan.findUnique({ where: { id }, select: { audience: true, isDefault: true } });
    if (!current) return null;

    // Keep a single default per audience: promoting a plan demotes the previous default.
    const audience = input.audience ?? current.audience;
    if (input.isDefault ?? current.isDefault) {
      await tx.plan.updateMany({
        where: { audience, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return tx.plan.update({ where: { id }, data: input });
  }).catch(rethrowDuplicatePrice);
}

export function toPublicPlan(plan: Plan) {
  return {
    id: plan.id,
    label: plan.label,
    description: plan.description,
    audience: plan.audience,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    essayCreditsPerMonth: plan.essayCreditsPerMonth,
    listsPerMonth: plan.listsPerMonth,
    questionsPerDay: plan.questionsPerDay,
    isDefault: plan.isDefault,
    highlight: plan.highlight,
    // A paid interval is purchasable only once its Stripe price is configured.
    sellsMonthly: plan.monthlyPrice !== null && plan.stripePriceId !== null,
    sellsYearly: plan.yearlyPrice !== null && plan.stripeYearlyPriceId !== null,
  };
}

export type PublicPlan = ReturnType<typeof toPublicPlan>;

export function stripePriceFor(plan: Pick<Plan, "stripePriceId" | "stripeYearlyPriceId">, interval: BillingInterval) {
  return interval === "YEAR" ? plan.stripeYearlyPriceId : plan.stripePriceId;
}

// Stripe price ids are unique per plan, so the price a customer pays identifies their plan
// even after an admin renames it.
export async function findPlanByStripePrice(priceId: string) {
  const plan = await prisma.plan.findFirst({
    where: { OR: [{ stripePriceId: priceId }, { stripeYearlyPriceId: priceId }] },
  });
  if (!plan) return null;
  const interval: BillingInterval = plan.stripeYearlyPriceId === priceId ? "YEAR" : "MONTH";
  return { plan, interval };
}
