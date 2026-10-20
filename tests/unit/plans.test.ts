import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

const tx = {
  plan: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn(), create: vi.fn() },
};
const db = { ...tx, $transaction: vi.fn() };

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { createPlan, planInputSchema, toPublicPlan, updatePlan } = await import("@/server/plans");

const INPUT = {
  label: "Premium",
  description: "Tudo",
  audience: "STUDENT",
  monthlyPrice: 19.9,
  yearlyPrice: null,
  stripePriceId: "price_123",
  stripeYearlyPriceId: "",
  essayCreditsPerMonth: 1,
  listsPerMonth: null,
  questionsPerDay: null,
  isDefault: false,
  highlight: false,
  isActive: true,
  sortOrder: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx));
});

describe("planInputSchema", () => {
  it("accepts a plan and turns blank Stripe ids into null", () => {
    expect(planInputSchema.parse(INPUT).stripeYearlyPriceId).toBeNull();
  });

  it.each([
    ["a negative limit", { questionsPerDay: -1 }],
    ["a fractional limit", { essayCreditsPerMonth: 1.5 }],
    ["a Stripe product id instead of a price id", { stripePriceId: "prod_123" }],
    ["an unknown audience", { audience: "PARENT" }],
  ])("rejects %s", (_case, patch) => {
    expect(planInputSchema.safeParse({ ...INPUT, ...patch }).success).toBe(false);
  });
});

describe("default plan", () => {
  it("creating a default demotes the previous default of the same audience", async () => {
    await createPlan(planInputSchema.parse({ ...INPUT, isDefault: true }));

    expect(tx.plan.updateMany).toHaveBeenCalledWith({
      where: { audience: "STUDENT", isDefault: true },
      data: { isDefault: false },
    });
  });

  it("promoting a plan demotes the others of its audience but not itself", async () => {
    tx.plan.findUnique.mockResolvedValue({ audience: "TEACHER", isDefault: false });

    await updatePlan("p1", { isDefault: true });

    expect(tx.plan.updateMany).toHaveBeenCalledWith({
      where: { audience: "TEACHER", isDefault: true, id: { not: "p1" } },
      data: { isDefault: false },
    });
  });

  it("editing a non-default plan leaves the default alone", async () => {
    tx.plan.findUnique.mockResolvedValue({ audience: "TEACHER", isDefault: false });
    await updatePlan("p1", { label: "Novo nome" });
    expect(tx.plan.updateMany).not.toHaveBeenCalled();
  });

  it("returns null for an unknown plan", async () => {
    tx.plan.findUnique.mockResolvedValue(null);
    expect(await updatePlan("missing", { label: "x" })).toBeNull();
  });
});

it("reports a Stripe price already used by another plan as a conflict", async () => {
  tx.plan.create.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }),
  );
  await expect(createPlan(planInputSchema.parse(INPUT))).rejects.toMatchObject({ status: 409 });
});

it("public plans hide Stripe ids and only sell intervals with a configured price", () => {
  const plan = { ...planInputSchema.parse(INPUT), id: "p1", createdAt: new Date(), updatedAt: new Date() };
  const pub = toPublicPlan(plan);

  expect(pub).not.toHaveProperty("stripePriceId");
  expect(pub).toMatchObject({ sellsMonthly: true, sellsYearly: false });
  expect(toPublicPlan({ ...plan, stripePriceId: null }).sellsMonthly).toBe(false);
});
