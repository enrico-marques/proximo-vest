import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";

/**
 * GET /api/plans/available
 * Lista os planos ativos. Pública: alimenta a página de preços da landing.
 */
export const GET = defineRoute("public", async () => {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPrice: "asc" },
    select: {
      id: true,
      key: true,
      label: true,
      description: true,
      type: true,
      monthlyPrice: true,
      yearlyPrice: true,
      highlight: true,
      isActive: true,
    },
  });

  return NextResponse.json(plans);
});

/**
 * POST /api/plans/available
 * Criação de um novo plano
 * Agora suporta mensal + anual + stripePriceIds
 */
export const POST = defineRoute({ perm: "plan.manage" }, async (req) => {
  const body = await req.json();

  const {
    key,
    label,
    description,
    type,
    monthlyPrice,
    yearlyPrice,          // NOVO
    highlight,
    isActive,             // NOVO (opcional)
    stripePriceId,        // NOVO (mensal)
    stripeYearlyPriceId,  // NOVO (anual)
  } = body;

  // validações básicas
  if (!key || !label || !description || !type) {
    return NextResponse.json(
      { error: "Campos obrigatórios faltando" },
      { status: 400 }
    );
  }

  // Se não for plano totalmente grátis, garante que pelo menos um preço exista
  if (monthlyPrice == null && yearlyPrice == null) {
    return NextResponse.json(
      {
        error:
          "Defina ao menos um preço (mensal ou anual) ou ajuste a lógica para planos 100% gratuitos.",
      },
      { status: 400 }
    );
  }

  const plan = await prisma.plan.create({
    data: {
      key,
      label,
      description,
      type,
      monthlyPrice: monthlyPrice ?? null,
      yearlyPrice: yearlyPrice ?? null,
      highlight: !!highlight,
      isActive: isActive ?? true,

      // Stripe IDs opcionais
      stripePriceId: stripePriceId ?? null,
      stripeYearlyPriceId: stripeYearlyPriceId ?? null,
    },
  });

  return NextResponse.json(plan, { status: 201 });
});
