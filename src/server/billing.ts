import type Stripe from "stripe";
import { z } from "zod";

import type { BillingInterval, SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { HttpError } from "@/server/auth/define-route";
import { findPlanByStripePrice, getPlan, stripePriceFor } from "@/server/plans";
import { isActiveSubscription } from "@/server/subscription";

export const checkoutInputSchema = z.object({
  planId: z.string().min(1),
  interval: z.enum(["MONTH", "YEAR"]).default("MONTH"),
  couponCode: z.string().trim().min(1).max(64).optional(),
});

/**
 * Starts a Stripe Checkout for a plan. Nothing is written locally: the subscription only
 * exists once the webhook confirms payment.
 */
export async function startCheckout(
  user: { id: string; email: string },
  input: z.infer<typeof checkoutInputSchema>,
) {
  const [plan, current] = await Promise.all([
    getPlan(input.planId),
    prisma.subscription.findUnique({ where: { userId: user.id } }),
  ]);

  if (!plan?.isActive) throw new HttpError(404, "Plano indisponível.");

  const price = stripePriceFor(plan, input.interval);
  if (!price) throw new HttpError(400, "Este plano não está à venda neste intervalo.");

  // A second Checkout would bill the customer twice; plan changes go through the Stripe portal.
  if (current?.stripeSubscriptionId && isActiveSubscription(current)) {
    throw new HttpError(409, "Você já tem uma assinatura ativa. Use o portal para trocar de plano.");
  }

  const metadata = { userId: user.id, planId: plan.id };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    client_reference_id: user.id,
    ...(current?.stripeCustomerId ? { customer: current.stripeCustomerId } : { customer_email: user.email }),
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/dashboard/assinatura?success=true`,
    cancel_url: `${appUrl}/dashboard/assinatura?canceled=true`,
    subscription_data: { metadata },
    metadata,
    ...(input.couponCode ? { discounts: [{ coupon: input.couponCode }] } : {}),
  });

  return session.url;
}

function toLocalStatus(sub: Stripe.Subscription): SubscriptionStatus {
  if (sub.status === "canceled" || sub.status === "incomplete_expired") return "CANCELED";
  if (sub.status !== "active" && sub.status !== "trialing") return "EXPIRED";
  return sub.cancel_at_period_end || sub.cancel_at ? "CANCEL_AT_PERIOD_END" : "ACTIVE";
}

function periodEnd(sub: Stripe.Subscription) {
  const end = sub.cancel_at ?? sub.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000) : null;
}

function customerId(customer: string | { id: string } | null) {
  return typeof customer === "string" ? customer : (customer?.id ?? null);
}

/**
 * Mirrors a Stripe subscription onto the local one. The plan comes from the price being
 * paid, so it stays right when the customer switches plans in the Stripe portal.
 */
export async function syncStripeSubscription(sub: Stripe.Subscription, fallbackUserId?: string | null) {
  const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
  const userId = existing?.userId ?? sub.metadata?.userId ?? fallbackUserId ?? null;
  if (!userId) {
    console.warn("[billing] Stripe subscription without a known user", { subscription: sub.id });
    return;
  }

  const priceId = sub.items.data[0]?.price.id;
  const match = priceId ? await findPlanByStripePrice(priceId) : null;
  const planId = match?.plan.id ?? existing?.planId ?? sub.metadata?.planId;
  if (!planId) {
    console.warn("[billing] Stripe price matches no plan", { subscription: sub.id, priceId });
    return;
  }

  const interval: BillingInterval =
    match?.interval ?? (sub.items.data[0]?.price.recurring?.interval === "year" ? "YEAR" : "MONTH");

  const data = {
    planId,
    status: toLocalStatus(sub),
    expiresAt: periodEnd(sub),
    billingInterval: interval,
    stripeCustomerId: customerId(sub.customer),
    stripeSubscriptionId: sub.id,
  };

  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!subscriptionId) return;
      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      await syncStripeSubscription(sub, session.client_reference_id ?? session.metadata?.userId);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncStripeSubscription(event.data.object);
      return;
    default:
      return;
  }
}
