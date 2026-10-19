import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  examBoardId: z.number().int(),
  year: z.number().int(),
  editionLabel: z.string(),
  notes: z.string().nullable().optional()
});

export const POST = defineRoute({ perm: "examEdition.manage" }, async (req) => {
  try {
    const body = Schema.parse(await req.json());
    const created = await prisma.examEdition.create({ data: body });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 400 });
  }
});
