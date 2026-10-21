import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";
import { EXAM_PHASE_READ, getExamPhase } from "@/server/exams";

type Params = { id: string };

export const GET = defineRoute<Params>({ perm: EXAM_PHASE_READ }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
  }

  const row = await getExamPhase(id);
  if (!row) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
  return NextResponse.json(row);
});

const PatchSchema = z.object({
  subjectBlock: z.string().nullable().optional(),
  questionCountExpected: z.number().int().nullable().optional(),
  defaultOptionCount: z.number().int().nullable().optional(),
  isDiscursive: z.boolean().optional(),
});

export const PATCH = defineRoute<Params>({ perm: "examPhase.manage" }, async (req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
  }

  const data = PatchSchema.parse(await req.json());
  const updated = await prisma.examPhase.update({ where: { id }, data });
  return NextResponse.json(updated);
});

export const DELETE = defineRoute<Params>({ perm: "examPhase.manage" }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
  }

  await prisma.examPhase.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
