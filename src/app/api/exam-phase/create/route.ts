import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  examEditionId: z.number().int(),
  phaseNumber: z.number().int(),
  dayNumber: z.number().int().nullable().optional(),
  subjectBlock: z.string().nullable().optional(),
  questionCountExpected: z.number().int().nullable().optional(),
  defaultOptionCount: z.number().int().nullable().optional(), // 4 ou 5
  isDiscursive: z.boolean().default(false)
});

export const POST = defineRoute({ perm: "examPhase.manage" }, async (req) => {
  const data = Schema.parse(await req.json());
  const created = await prisma.examPhase.create({ data });
  return NextResponse.json(created, { status: 201 });
});
