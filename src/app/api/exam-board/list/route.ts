export const runtime = "nodejs"
import { z } from "zod"
import { json } from "../../_utils"
import { defineRoute } from "@/server/auth/define-route";
import { EXAM_BOARD_READ, listExamBoards } from "@/server/exams";

const Schema = z.object({
  filter: z.string().optional(),
})

export const GET = defineRoute({ perm: EXAM_BOARD_READ }, async (req) => {
  const { searchParams } = new URL(req.url)
  const { filter } = Schema.parse({ filter: searchParams.get("filter") || undefined })

  return json(await listExamBoards({ filter }))
});
