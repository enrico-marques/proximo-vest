import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";


export const GET = defineRoute({ perm: ["perm.read", "perm.manage", "role.manage"] }, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get("onlyActive");
    const resource = searchParams.get("resource"); // opcional, filtrar por "exam"

    const where: any = {};
    if (onlyActive === "true") where.isActive = true;
    if (resource) where.resource = resource;

    const rows = await prisma.permission.findMany({
      where,
      orderBy: [{ resource: "asc" }, { action: "asc" }],
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
