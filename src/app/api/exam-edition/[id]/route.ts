import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

type Params = { id: string };

export const GET = defineRoute<Params>({ perm: ["examEdition.read", "examEdition.manage"] }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
  }

  const row = await prisma.examEdition.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
  return NextResponse.json(row);
});

const PatchSchema = z.object({
  editionLabel: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export const PATCH = defineRoute<Params>({ perm: "examEdition.manage" }, async (req, ctx) => {
  try {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
    }

    const data = PatchSchema.parse(await req.json());
    const updated = await prisma.examEdition.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 400 });
  }
});

export const DELETE = defineRoute<Params>({ perm: "examEdition.manage" }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
  }

  await prisma.examEdition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
