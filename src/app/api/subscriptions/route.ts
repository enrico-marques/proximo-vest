import { NextResponse } from "next/server";
import { z } from "zod";

import { defineRoute } from "@/server/auth/define-route";
import { prisma } from "@/lib/prisma";

const filtersSchema = z.object({
  q: z.string().trim().max(100).default(""),
  status: z.enum(["ACTIVE", "CANCEL_AT_PERIOD_END", "CANCELED", "EXPIRED"]).optional().catch(undefined),
});

export const GET = defineRoute({ perm: ["subscription.read", "subscription.manage"] }, async (req) => {
  const { searchParams } = new URL(req.url);
  const { q, status } = filtersSchema.parse({
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  const subscriptions = await prisma.subscription.findMany({
    where: {
      AND: [
        status ? { status } : {},
        q
          ? {
              OR: [
                { user: { email: { contains: q, mode: "insensitive" } } },
                { user: { name: { contains: q, mode: "insensitive" } } },
                { stripeSubscriptionId: { contains: q } },
                { plan: { label: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subscriptions);
});
