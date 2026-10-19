import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";
export const GET = defineRoute({ perm: ["plan.read", "plan.manage"] }, async () => {
  const plans = await prisma.plan.findMany({
    orderBy: { monthlyPrice: "asc" },
  });

  return NextResponse.json(plans);
});
