import { z } from "zod"
import { json } from "../../_utils"
import { defineRoute } from "@/server/auth/define-route";
import { listQuestions, QUESTION_LIST_INCLUDES } from "@/server/questions";

const Schema = z.object({
  examPhaseId: z.coerce.number().int().optional(),
  subject: z.string().optional(), // slug
  isDiscursive: z.coerce.boolean().optional(),
  include: z.array(z.enum(QUESTION_LIST_INCLUDES)).optional(),
  orderBy: z.enum(["id", "numberLabel", "createdAt"]).default("numberLabel"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})

export const GET = defineRoute({ perm: ["question.read", "question.create", "question.update"] }, async (req) => {
  const { searchParams } = new URL(req.url)

  // Supports both ?include=a&include=b and ?include=a,b
  const includeParams = searchParams
    .getAll("include")
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean)

  const query = Schema.parse({
    examPhaseId: searchParams.get("examPhaseId"),
    subject: searchParams.get("subject") ?? undefined,
    isDiscursive: searchParams.get("isDiscursive") ?? undefined,
    include: includeParams.length ? includeParams : undefined,
    orderBy: searchParams.get("orderBy") ?? undefined,
    order: searchParams.get("order") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  })

  return json(await listQuestions(query))
});
