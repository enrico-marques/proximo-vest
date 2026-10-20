import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod"
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  examBoardId: z.coerce.number().int().optional(), // coerce permite receber "1" como número
  year: z.coerce.number().int().optional(),
})

export const GET = defineRoute({ perm: ["examEdition.read", "examEdition.manage"] }, async (req) => {
  const { searchParams } = new URL(req.url)
  const examBoardId = searchParams.get("examBoardId")
  const year = searchParams.get("year")

  // valida e converte automaticamente
  const { examBoardId: validatedExamBoardId, year: validatedYear } = Schema.parse({
    examBoardId,
    year,
  })

  const where: Prisma.ExamEditionWhereInput = {}
  if (validatedExamBoardId) where.examBoardId = validatedExamBoardId
  if (validatedYear) where.year = validatedYear

  const rows = await prisma.examEdition.findMany({
    where,
    orderBy: [{ year: "desc" }, { editionLabel: "asc" }],
  })

  return NextResponse.json(rows)
});
