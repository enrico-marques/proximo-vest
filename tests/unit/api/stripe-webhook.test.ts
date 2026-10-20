import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

const constructEvent = vi.fn();
const db = {
  processedStripeEvent: { create: vi.fn(), delete: vi.fn() },
  subscription: { findFirst: vi.fn(), update: vi.fn(), upsert: vi.fn() },
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
  data: { object: { id: "sub_1", metadata: {} } },
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
  db.subscription.findFirst.mockResolvedValue({ userId: "user-1" });
});

describe("Stripe webhook", () => {
  it("rejects payloads with an invalid signature before recording anything", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    expect((await deliver()).status).toBe(400);
    expect(db.processedStripeEvent.create).not.toHaveBeenCalled();
  });

  it("claims the event id and then handles the event", async () => {
    const res = await deliver();

    expect(res.status).toBe(200);
    expect(db.processedStripeEvent.create).toHaveBeenCalledWith({
      data: { id: "evt_123", type: "customer.subscription.deleted" },
    });
    expect(db.subscription.update).toHaveBeenCalledTimes(1);
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
    expect(db.subscription.update).not.toHaveBeenCalled();
  });

  it("releases the claim when handling fails so Stripe can retry", async () => {
    db.subscription.update.mockRejectedValue(new Error("db down"));

    const res = await deliver();

    expect(res.status).toBe(500);
    expect(db.processedStripeEvent.delete).toHaveBeenCalledWith({ where: { id: "evt_123" } });
  });
});
