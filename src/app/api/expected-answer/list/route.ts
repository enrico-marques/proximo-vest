import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { z } from "zod"
import { defineRoute } from "@/server/auth/define-route";
 
const Schema = z.object({
  questionId: z.coerce.number().int(),
})

export const GET = defineRoute({ perm: ["expectedAnswer.read", "expectedAnswer.manage"] }, async (req) => {
  try {
    const { searchParams } = new URL(req.url)
    const questionId = searchParams.get("questionId")

    const { questionId: validatedId } = Schema.parse({ questionId })

    const rows = await prisma.frAnswerExpected.findMany({
      where: { frItemId: validatedId },
      orderBy: { id: "asc" },
    })

    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 400 })
  }
});
