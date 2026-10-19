import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";
export const GET = defineRoute({ perm: ["coupon.read", "coupon.manage"] }, async () => {
  const plans = await prisma.coupon.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(plans);
});
