import { NextResponse } from "next/server";
import { z } from "zod";

import { defineRoute, HttpError } from "@/server/auth/define-route";
import { prisma } from "@/lib/prisma";
import { adminSubscriptionInclude, getSubscriptionForAdmin } from "@/server/subscription";

export const GET = defineRoute<{ userId: string }>(
  { perm: ["subscription.read", "subscription.manage"] },
  async (_req, { params }) => {
    const subscription = await getSubscriptionForAdmin(params.userId);
    if (!subscription) throw new HttpError(404, "Assinatura não encontrada");
    return NextResponse.json(subscription);
  },
);

const updateSchema = z.object({
  planId: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "CANCEL_AT_PERIOD_END", "CANCELED", "EXPIRED"]).optional(),
  stripeSubscriptionId: z.string().trim().min(1).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const PUT = defineRoute<{ userId: string }>({ perm: "subscription.manage" }, async (req, { params }) => {
  const input = updateSchema.parse(await req.json());

  // Only the fields that were sent are written; undefined never reaches the query.
  const data = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));

  const subscription = await prisma.subscription.update({
    where: { userId: params.userId },
    data,
    include: adminSubscriptionInclude,
  });

  return NextResponse.json(subscription);
});
