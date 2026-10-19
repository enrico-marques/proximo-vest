import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";

export const runtime = "nodejs";

// Use uma apiVersion real e estável (ou remova para usar a do dashboard)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

type BillingInterval = "MONTH" | "YEAR";

function resolveBillingIntervalFromString(
  value?: string | null
): BillingInterval {
  if (!value) return "MONTH";
  return value.toUpperCase() === "YEAR" ? "YEAR" : "MONTH";
}

function resolveBillingIntervalFromStripeSub(rawSub: any): BillingInterval {
  // Tenta pelos metadados primeiro
  if (rawSub?.metadata?.billingInterval) {
    return resolveBillingIntervalFromString(rawSub.metadata.billingInterval);
  }

  // Tenta pegar do price/plan da assinatura (Stripe)
  const item = rawSub.items?.data?.[0];

  const intervalFromPrice: string | undefined =
    item?.price?.recurring?.interval ?? item?.plan?.interval;

  if (intervalFromPrice === "year") return "YEAR";

  return "MONTH";
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    //
    // 1) Checkout finalizado com sucesso
    //
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const planKey = session.metadata?.planKey;
      const billingIntervalMeta = session.metadata?.billingInterval;

      if (!userId || !planKey) {
        console.warn(
          "checkout.session.completed sem userId/planKey na metadata"
        );
        break;
      }

      const billingInterval: BillingInterval =
        resolveBillingIntervalFromString(billingIntervalMeta);

      const stripeSubscriptionId = session.subscription as string | null;

      let expiresAt: Date | null = null;
      if (stripeSubscriptionId) {
        try {
          const sub: any = await stripe.subscriptions.retrieve(
            stripeSubscriptionId
          );

          const periodEndUnix: number | undefined =
            sub.current_period_end ?? sub.current_period?.end ?? undefined;

          if (periodEndUnix) {
            expiresAt = new Date(periodEndUnix * 1000);
          }
        } catch (err) {
          console.warn("Não foi possível buscar subscription no Stripe:", err);
        }
      }

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          planKey,
          status: "ACTIVE",
          stripeSubscriptionId: stripeSubscriptionId ?? undefined,
          expiresAt,
          billingInterval,
        },
        create: {
          userId,
          planKey,
          status: "ACTIVE",
          stripeSubscriptionId: stripeSubscriptionId ?? undefined,
          expiresAt,
          billingInterval,
        },
      });

      console.log("✅ Subscription criada/atualizada após checkout", {
        userId,
        planKey,
        stripeSubscriptionId,
        billingInterval,
      });

      break;
    }

    //
    // 2) Criação / atualização da assinatura (inclui cancelamento ao fim do período)
    //
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const rawSub: any = event.data.object;
      const stripeSubscriptionId: string = rawSub.id;

      const existing = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId },
      });

      let userId: string | null =
        existing?.userId ?? rawSub.metadata?.userId ?? null;
      const planKey: string | null =
        rawSub.metadata?.planKey ?? existing?.planKey ?? null;

      if (!userId) {
        console.warn(
          "subscription.created/updated sem userId (nem no DB nem na metadata)",
          { stripeSubscriptionId }
        );
        break;
      }

      const status: string = rawSub.status;

      const isActiveStripe = status === "active" || status === "trialing";

      const cancelAtPeriodEnd: boolean =
        rawSub.cancel_at_period_end ?? false;

      const cancelAtUnix: number | undefined = rawSub.cancel_at;

      const periodEndUnix: number | undefined =
        cancelAtUnix ??
        rawSub.current_period_end ??
        rawSub.current_period?.end ??
        undefined;

      const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

      const hasScheduledCancel =
        !!cancelAtUnix || cancelAtPeriodEnd;

      let localStatus:
        | "ACTIVE"
        | "CANCEL_AT_PERIOD_END"
        | "CANCELED"
        | "EXPIRED";

      if (status === "canceled") {
        localStatus = "CANCELED";
      } else if (hasScheduledCancel) {
        localStatus = "CANCEL_AT_PERIOD_END";
      } else if (isActiveStripe) {
        localStatus = "ACTIVE";
      } else {
        localStatus = "EXPIRED";
      }

      const resolvedPlanKey: string | undefined =
        planKey ?? existing?.planKey ?? undefined;

      const billingInterval: BillingInterval =
        resolveBillingIntervalFromStripeSub(rawSub);

      await prisma.subscription.upsert({
        where: { userId },
        update: {
          planKey: resolvedPlanKey,
          status: localStatus,
          stripeSubscriptionId,
          expiresAt: periodEnd,
          billingInterval,
        },
        create: {
          userId,
          planKey: planKey ?? "unknown",
          status: localStatus,
          stripeSubscriptionId,
          expiresAt: periodEnd,
          billingInterval,
        },
      });

      console.log("✅ Subscription atualizada (created/updated)", {
        eventType: event.type,
        userId,
        planKey: planKey ?? existing?.planKey,
        stripeSubscriptionId,
        localStatus,
        expiresAt: periodEnd,
        billingInterval,
      });

      break;
    }

    //
    // 3) Assinatura deletada (caso extremo)
    //
    case "customer.subscription.deleted": {
      const rawSub: any = event.data.object;
      const stripeSubscriptionId: string = rawSub.id;

      const existing = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId },
      });

      let userId: string | null =
        existing?.userId ?? rawSub.metadata?.userId ?? null;

      if (!userId) {
        console.warn(
          "customer.subscription.deleted sem userId (nem no DB nem na metadata)",
          { stripeSubscriptionId }
        );
        break;
      }

      await prisma.subscription.update({
        where: { userId },
        data: {
          status: "CANCELED",
          expiresAt: new Date(),
        },
      });

      console.log("✅ Subscription marcada como CANCELED (deleted)", {
        userId,
        stripeSubscriptionId,
      });

      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

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
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("⚠️ Erro webhook:", err);
    return new NextResponse("Webhook Error: invalid signature", { status: 400 });
  }

  console.log("🔔 Stripe webhook recebido:", event.type);

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
    await handleEvent(event);
  } catch (err) {
    await prisma.processedStripeEvent.delete({ where: { id: event.id } });
    throw err;
  }

  return NextResponse.json({ received: true });
});
