import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { defineRoute } from "@/server/auth/define-route";

export const POST = defineRoute({}, async (req, { user }) => {
  const body = await req.json();
  const { planKey, couponCode, interval } = body as {
    planKey?: string;
    couponCode?: string;
    interval?: "MONTH" | "YEAR" | "month" | "year";
  };

  if (!planKey) {
    return NextResponse.json(
      { error: "planKey é obrigatório." },
      { status: 400 }
    );
  }

  // Normaliza intervalo (default: MONTH)
  const billingInterval: "MONTH" | "YEAR" =
    interval && interval.toUpperCase() === "YEAR" ? "YEAR" : "MONTH";

  // Buscar plano
  const plan = await prisma.plan.findUnique({
    where: { key: planKey },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 404 });
  }

  // Escolher o priceId correto conforme o intervalo
  const stripePriceId =
    billingInterval === "YEAR" ? plan.stripeYearlyPriceId : plan.stripePriceId;

  if (!stripePriceId) {
    return NextResponse.json(
      {
        error:
          billingInterval === "YEAR"
            ? "Este plano não possui stripeYearlyPriceId configurado para anual."
            : "Este plano não possui stripePriceId configurado para mensal.",
      },
      { status: 500 }
    );
  }

  // Buscar assinatura atual do user
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  // Se já existir stripeCustomerId, usa
  let customerId = sub?.stripeCustomerId ?? null;

  // Se ainda não existir, cria um customer novo
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      name: user.name,
    });
    customerId = customer.id;

    // salvar customerId (e já deixar planKey + billingInterval coerentes)
    if (sub) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          stripeCustomerId: customerId,
          planKey: plan.key,
          billingInterval,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planKey: plan.key,
          status: "ACTIVE", // você pode depois ajustar isso via webhook se quiser
          billingInterval,
          stripeCustomerId: customerId,
        },
      });
    }
  } else {
    // Se já tinha subscription e customer, opcionalmente já atualiza o plano/intervalo pretendido
    await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        planKey: plan.key,
        billingInterval,
      },
    });
  }

  // Criar checkout session
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/assinatura?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/assinatura?canceled=true`,
    subscription_data: {
      metadata: {
        userId: user.id,
        planKey: plan.key,
        billingInterval, // importante pro webhook
      },
    },
    metadata: {
      userId: user.id,
      planKey: plan.key,
      billingInterval,
    },
  };

  if (couponCode) {
    params.discounts = [{ coupon: couponCode }];
  }

  const checkout = await getStripe().checkout.sessions.create(params);

  return NextResponse.json({ url: checkout.url });
});
