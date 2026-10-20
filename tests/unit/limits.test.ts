import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  subscription: { findUnique: vi.fn() },
  plan: { findFirst: vi.fn() },
  usageCounter: { upsert: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
};

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { consumeUsage, getUsageSummary, LimitExceededError, usagePeriod } = await import("@/server/limits");
const { resolvePlan } = await import("@/server/subscription");

const NOW = new Date("2026-10-20T12:00:00Z");
const plan = (over: Record<string, unknown> = {}) => ({
  id: "plan",
  audience: "TEACHER",
  essayCreditsPerMonth: null,
  listsPerMonth: 5,
  questionsPerDay: null,
  ...over,
});
const subscription = (over: Record<string, unknown> = {}) => ({
  status: "ACTIVE",
  expiresAt: null,
  plan: plan({ id: "paid", listsPerMonth: null }),
  ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  db.subscription.findUnique.mockResolvedValue(null);
  db.plan.findFirst.mockResolvedValue(plan({ id: "default" }));
});

describe("usagePeriod", () => {
  it("uses Brazilian civil time, so late evening still counts for the same day and month", () => {
    const lateOctober31 = new Date("2026-11-01T02:30:00Z"); // 23:30 on Oct 31 in São Paulo
    expect(usagePeriod("TEACHER_LIST", lateOctober31)).toBe("2026-10");
    expect(usagePeriod("QUESTION_ANSWER", lateOctober31)).toBe("2026-10-31");
  });
});

describe("resolvePlan", () => {
  it("uses the plan of an active subscription for the same audience", async () => {
    db.subscription.findUnique.mockResolvedValue(subscription());
    expect((await resolvePlan("u1", "TEACHER", undefined, NOW))?.id).toBe("paid");
  });

  it("keeps access until the end of the period after a cancellation", async () => {
    db.subscription.findUnique.mockResolvedValue(
      subscription({ status: "CANCEL_AT_PERIOD_END", expiresAt: new Date("2026-10-30T00:00:00Z") }),
    );
    expect((await resolvePlan("u1", "TEACHER", undefined, NOW))?.id).toBe("paid");
  });

  it.each([
    ["expired", subscription({ expiresAt: new Date("2026-10-01T00:00:00Z") })],
    ["canceled", subscription({ status: "CANCELED" })],
    ["sold to another audience", subscription({ plan: plan({ id: "paid", audience: "STUDENT" }) })],
  ])("falls back to the audience default when the subscription is %s", async (_case, sub) => {
    db.subscription.findUnique.mockResolvedValue(sub);
    expect((await resolvePlan("u1", "TEACHER", undefined, NOW))?.id).toBe("default");
    expect(db.plan.findFirst).toHaveBeenCalledWith({ where: { audience: "TEACHER", isDefault: true } });
  });
});

describe("consumeUsage", () => {
  const key = { userId: "u1", metric: "TEACHER_LIST", period: "2026-10" };

  it("refuses without counting when the plan does not include the action", async () => {
    db.plan.findFirst.mockResolvedValue(plan({ listsPerMonth: 0 }));

    await expect(consumeUsage("u1", "TEACHER_LIST", undefined, NOW)).rejects.toThrow("não inclui");
    expect(db.usageCounter.upsert).not.toHaveBeenCalled();
  });

  it("refuses when no default plan is configured for the audience", async () => {
    db.plan.findFirst.mockResolvedValue(null);
    await expect(consumeUsage("u1", "TEACHER_LIST", undefined, NOW)).rejects.toBeInstanceOf(LimitExceededError);
  });

  it("counts within the limit with a conditional increment", async () => {
    db.usageCounter.updateMany.mockResolvedValue({ count: 1 });

    await consumeUsage("u1", "TEACHER_LIST", undefined, NOW);

    expect(db.usageCounter.updateMany).toHaveBeenCalledWith({
      where: { ...key, count: { lt: 5 } },
      data: { count: { increment: 1 } },
    });
  });

  it("refuses once the counter reached the limit", async () => {
    db.usageCounter.updateMany.mockResolvedValue({ count: 0 });

    const err = await consumeUsage("u1", "TEACHER_LIST", undefined, NOW).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LimitExceededError);
    expect(err).toMatchObject({ status: 403, limit: 5 });
  });

  it("only counts when the plan is unlimited", async () => {
    db.subscription.findUnique.mockResolvedValue(subscription());

    await consumeUsage("u1", "TEACHER_LIST", undefined, NOW);

    expect(db.usageCounter.upsert).toHaveBeenCalledWith({
      where: { userId_metric_period: key },
      create: { ...key, count: 1 },
      update: { count: { increment: 1 } },
    });
    expect(db.usageCounter.updateMany).not.toHaveBeenCalled();
  });

  it("runs on the caller's transaction client", async () => {
    const tx = {
      subscription: { findUnique: vi.fn().mockResolvedValue(null) },
      plan: { findFirst: vi.fn().mockResolvedValue(plan()) },
      usageCounter: { upsert: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };

    await consumeUsage("u1", "TEACHER_LIST", tx as never, NOW);

    expect(tx.usageCounter.updateMany).toHaveBeenCalled();
    expect(db.usageCounter.updateMany).not.toHaveBeenCalled();
  });
});

describe("getUsageSummary", () => {
  it("reports this period's usage against the plan limits", async () => {
    db.usageCounter.findMany.mockResolvedValue([{ metric: "TEACHER_LIST", count: 3 }]);

    const { plan: current, usage } = await getUsageSummary("u1", "TEACHER", NOW);

    expect(current?.id).toBe("default");
    expect(usage).toEqual([{ metric: "TEACHER_LIST", label: "Listas por mês", used: 3, limit: 5 }]);
  });
});
