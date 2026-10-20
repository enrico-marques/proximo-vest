import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  questionId: z.number().int(),        // da questão discursiva
  label: z.string().optional(),        // "a)", "b)" ...
  answerHtml: z.string().optional(),
  maxScore: z.number().optional()
});

export const POST = defineRoute({ perm: "expectedAnswer.manage" }, async (req) => {
  const { questionId, label, answerHtml, maxScore } = Schema.parse(await req.json());
  const fr = await prisma.frItem.findUnique({ where: { questionId } });
  if (!fr) return NextResponse.json({ error: { message: "Discursive FrItem not found" } }, { status: 400 });

  const created = await prisma.frAnswerExpected.create({
    data: { frItemId: questionId, label, answerHtml, maxScore }
  });
  return NextResponse.json(created, { status: 201 });
});
