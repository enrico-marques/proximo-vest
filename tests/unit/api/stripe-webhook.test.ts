import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

const constructEvent = vi.fn();
const db = {
  processedStripeEvent: { create: vi.fn(), delete: vi.fn() },
  subscription: { findUnique: vi.fn(), upsert: vi.fn() },
  plan: { findFirst: vi.fn() },
};

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: (...a: unknown[]) => constructEvent(...a) };
    subscriptions = { retrieve: vi.fn() };
  },
}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

process.env.STRIPE_SECRET_KEY = "sk_test_unit";

const { POST } = await import("@/app/api/billing/webhook/route");

const EVENT = {
  id: "evt_123",
  type: "customer.subscription.deleted",
  data: {
    object: {
      id: "sub_1",
      status: "canceled",
      customer: "cus_1",
      cancel_at: null,
      cancel_at_period_end: false,
      metadata: {},
      items: { data: [{ price: { id: "price_1" }, current_period_end: 1_900_000_000 }] },
    },
  },
};

const deliver = () =>
  POST(
    new NextRequest("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "t=1,v1=abc" },
    }),
    { params: Promise.resolve({}) },
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  constructEvent.mockReturnValue(EVENT);
  db.subscription.findUnique.mockResolvedValue({ userId: "user-1", planId: "plan-old" });
  db.plan.findFirst.mockResolvedValue({ id: "plan-1", stripePriceId: "price_1", stripeYearlyPriceId: null });
});

describe("Stripe webhook", () => {
  it("rejects payloads with an invalid signature before recording anything", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    expect((await deliver()).status).toBe(400);
    expect(db.processedStripeEvent.create).not.toHaveBeenCalled();
  });

  it("claims the event id and syncs the plan from the price being paid", async () => {
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(db.processedStripeEvent.create).toHaveBeenCalledWith({
      data: { id: "evt_123", type: "customer.subscription.deleted" },
    });
    expect(db.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        update: expect.objectContaining({ planId: "plan-1", status: "CANCELED", stripeCustomerId: "cus_1" }),
      }),
    );
  });

  it("acknowledges a repeated delivery without handling it again", async () => {
    db.processedStripeEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const res = await deliver();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, duplicate: true });
    expect(db.subscription.upsert).not.toHaveBeenCalled();
  });

  it("releases the claim when handling fails so Stripe can retry", async () => {
    db.subscription.upsert.mockRejectedValue(new Error("db down"));

    const res = await deliver();

    expect(res.status).toBe(500);
    expect(db.processedStripeEvent.delete).toHaveBeenCalledWith({ where: { id: "evt_123" } });
  });
});
