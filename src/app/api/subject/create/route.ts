import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";


const Schema = z.object({ name: z.string(), slug: z.string() });

export const POST = defineRoute({ perm: "subject.manage" }, async (req) => {
  try {
    const data = Schema.parse(await req.json());
    const created = await prisma.subject.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 400 });
  }
});
