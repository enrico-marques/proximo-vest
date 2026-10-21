import { NextResponse } from "next/server"
import { z } from "zod"
import { defineRoute } from "@/server/auth/define-route";
import { EXAM_PHASE_READ, listExamPhases } from "@/server/exams";

// Missing, empty or non-numeric query values mean "no filter".
const intFromQuery = z.preprocess(
  (v) => {
    if (v === null || v === "") return undefined
    const num = Number(v)
    return Number.isFinite(num) ? num : undefined
  },
  z.number().int().optional()
)

const Schema = z.object({
  examEditionId: intFromQuery,
  phaseNumber: intFromQuery,
  dayNumber: intFromQuery,
})

export const GET = defineRoute({ perm: EXAM_PHASE_READ }, async (req) => {
  const { searchParams } = new URL(req.url)

  const filters = Schema.parse({
    examEditionId: searchParams.get("examEditionId"),
    phaseNumber: searchParams.get("phaseNumber"),
    dayNumber: searchParams.get("dayNumber"),
  })

  return NextResponse.json(await listExamPhases(filters))
});
