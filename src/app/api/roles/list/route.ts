import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  // "true" | "false" vindo da URL, opcional
  isActive: z.enum(["true", "false"]).optional(),
});

export const GET = defineRoute({ perm: ["role.read", "role.manage"] }, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const isActiveParam = searchParams.get("isActive");

    // valida o valor da query
    const { isActive } = Schema.parse({
      isActive: isActiveParam ?? undefined,
    });

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const rows = await prisma.role.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: { message: e.message } },
      { status: 400 }
    );
  }
});
