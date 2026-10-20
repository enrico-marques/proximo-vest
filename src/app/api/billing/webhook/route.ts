import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { defineRoute } from "@/server/auth/define-route";
import { handleStripeEvent } from "@/server/billing";

export const runtime = "nodejs";

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export const POST = defineRoute("public", async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("⚠️ Erro webhook:", err);
    return new NextResponse("Webhook Error: invalid signature", { status: 400 });
  }

  // Stripe delivers at least once. Claiming the event id first makes concurrent or
  // repeated deliveries no-ops; the claim is released on failure so Stripe can retry.
  try {
    await prisma.processedStripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    await prisma.processedStripeEvent.delete({ where: { id: event.id } });
    throw err;
  }

  return NextResponse.json({ received: true });
});
