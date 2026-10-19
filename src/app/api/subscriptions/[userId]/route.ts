// app/api/admin/subscriptions/[userId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";



export const GET = defineRoute<{ userId: string }>({ perm: ["subscription.read", "subscription.manage"] }, async (_req, { params }) => {
  const { userId } = await params;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      plan: true,
    },
  });

  if (!subscription) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(subscription);
});

export const PUT = defineRoute<{ userId: string }>({ perm: "subscription.manage" }, async (req, { params }) => {
  const { userId } = await params;

  const body = await req.json();

  const {
    planKey,
    status,
    stripeSubscriptionId,
    expiresAt,
  } = body as {
    planKey?: string | null;
    status?: "ACTIVE" | "CANCEL_AT_PERIOD_END" | "CANCELED" | "EXPIRED";
    stripeSubscriptionId?: string | null;
    expiresAt?: string | null;
  };

  const subscription = await prisma.subscription.update({
    where: { userId },
    data: {
      planKey: planKey ?? undefined,
      status: status ?? undefined,
      stripeSubscriptionId:
        stripeSubscriptionId === null
          ? null
          : stripeSubscriptionId ?? undefined,
      expiresAt:
        expiresAt === null
          ? null
          : expiresAt
            ? new Date(expiresAt)
            : undefined,
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      plan: true,
    },
  });

  return NextResponse.json(subscription);
});
