import { NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute } from "@/server/auth/define-route";
import { listExamEditions } from "@/server/exams";

const Schema = z.object({
  examBoardId: z.coerce.number().int().optional(),
  year: z.coerce.number().int().optional(),
})

export const GET = defineRoute({ perm: ["examEdition.read", "examEdition.manage"] }, async (req) => {
  const { searchParams } = new URL(req.url)
  const { examBoardId, year } = Schema.parse({
    examBoardId: searchParams.get("examBoardId"),
    year: searchParams.get("year"),
  })

  // 0 (what an absent param coerces to) was never a valid filter.
  const rows = await listExamEditions({ examBoardId: examBoardId || undefined, year: year || undefined })

  return NextResponse.json(rows)
});
