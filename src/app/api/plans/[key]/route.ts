import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";


export const PATCH = defineRoute<{ key: string }>({ perm: "plan.manage" }, async (req, { params }) => {
  const { key } = await params;
  const body = await req.json();

  const { label, description, type, monthlyPrice, highlight, isActive } = body;

  const plan = await prisma.plan.update({
    where: { key },
    data: {
      label,
      description,
      type,
      monthlyPrice,
      highlight,
      isActive,
    },
  });

  return NextResponse.json(plan);
});
