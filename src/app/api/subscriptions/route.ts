// app/api/admin/subscriptions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";

export const GET = defineRoute({ perm: ["subscription.read", "subscription.manage"] }, async (req) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const status = searchParams.get("status") || "";

  const subscriptions = await prisma.subscription.findMany({
    where: {
      AND: [
        status
          ? {
              status: status as any,
            }
          : {},
        q
          ? {
              OR: [
                {
                  user: {
                    email: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  user: {
                    name: {
                      contains: q,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  stripeSubscriptionId: {
                    contains: q,
                  },
                },
                {
                  planKey: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {},
      ],
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
      plan: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(subscriptions);
});
