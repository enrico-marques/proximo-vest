import { prisma } from "../../../../lib/prisma"
import { NextRequest } from "next/server"
import { z } from "zod"
import { json, tryCatch, badRequest } from "../../_utils"
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  questionId: z.coerce.number().int(),
})

export const GET = defineRoute({ perm: ["rubric.read", "rubric.manage"] }, async (req) => {
  return tryCatch(async () => {
    const { searchParams } = new URL(req.url)
    const parsed = Schema.safeParse({
      questionId: searchParams.get("questionId"),
    })
    if (!parsed.success) return badRequest(parsed.error.message)

    const { questionId } = parsed.data

    const rows = await prisma.frRubric.findMany({
      where: { questionId },
      orderBy: { id: "asc" },
    })

    return json(rows)
  })
});
