import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getAuthProfile = vi.fn();
const createSession = vi.fn();
const db = {
  plan: { findUnique: vi.fn() },
  subscription: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
};

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));
vi.mock("@/utils/access", () => ({ getAuthProfile: (...a: unknown[]) => getAuthProfile(...a) }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: (...a: unknown[]) => createSession(...a) } } }),
}));

const { POST } = await import("@/app/api/billing/checkout/route");

const USER = { id: "user-1", email: "aluno@example.com", name: "Aluno" };
const PLAN = {
  id: "plan-1",
  isActive: true,
  stripePriceId: "price_month",
  stripeYearlyPriceId: null,
};

const checkout = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({}) },
  );

beforeEach(() => {
  vi.resetAllMocks();
  getSession.mockResolvedValue({ user: USER });
  getAuthProfile.mockResolvedValue({ emailVerified: true, status: "active", roles: [], perms: [] });
  db.plan.findUnique.mockResolvedValue(PLAN);
  db.subscription.findUnique.mockResolvedValue(null);
  createSession.mockResolvedValue({ url: "https://checkout.stripe.test/s" });
});

describe("checkout", () => {
  it("starts a Stripe Checkout for the plan's price without writing anything locally", async () => {
    const res = await checkout({ planId: "plan-1" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.test/s" });
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_month", quantity: 1 }],
        client_reference_id: USER.id,
        customer_email: USER.email,
        metadata: { userId: USER.id, planId: "plan-1" },
      }),
    );
    expect(db.subscription.create).not.toHaveBeenCalled();
    expect(db.subscription.update).not.toHaveBeenCalled();
    expect(db.subscription.upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["an inactive plan", { ...PLAN, isActive: false }],
    ["an unknown plan", null],
  ])("refuses %s", async (_case, plan) => {
    db.plan.findUnique.mockResolvedValue(plan);
    expect((await checkout({ planId: "plan-1" })).status).toBe(404);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("refuses an interval the plan is not sold on", async () => {
    expect((await checkout({ planId: "plan-1", interval: "YEAR" })).status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("refuses a second subscription while one is active", async () => {
    db.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      expiresAt: null,
      stripeSubscriptionId: "sub_1",
      stripeCustomerId: "cus_1",
    });
    expect((await checkout({ planId: "plan-1" })).status).toBe(409);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("reuses the Stripe customer of a past subscription", async () => {
    db.subscription.findUnique.mockResolvedValue({
      status: "CANCELED",
      expiresAt: null,
      stripeSubscriptionId: "sub_old",
      stripeCustomerId: "cus_1",
    });

    await checkout({ planId: "plan-1" });

    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_1" }));
    expect(createSession.mock.calls[0][0]).not.toHaveProperty("customer_email");
  });

  it("validates the body", async () => {
    expect((await checkout({ planKey: "STUDENT_PREMIUM" })).status).toBe(400);
  });
});
