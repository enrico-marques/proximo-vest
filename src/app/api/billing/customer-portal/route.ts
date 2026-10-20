import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { defineRoute } from "@/server/auth/define-route";

export const POST = defineRoute({}, async (_req, { user }) => {
  const userId = user.id;

  // Busca assinatura do usuário (pra pegar stripeCustomerId)
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "Nenhum cliente Stripe vinculado. Faça uma assinatura primeiro antes de gerenciar o billing.",
      },
      { status: 400 }
    );
  }

  const returnUrl =
    process.env.NEXT_PUBLIC_APP_URL?.concat("/dashboard/assinatura") ??
    "http://localhost:3000/dashboard/assinatura";

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portalSession.url });
});
