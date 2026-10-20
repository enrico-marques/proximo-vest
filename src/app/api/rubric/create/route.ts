import { prisma } from "../../../../lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { json, readBody, badRequest } from "../../_utils";
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  questionId: z.number().int(),
  criterion: z.string(),
  levelsJson: z.record(z.string(), z.string()),
});

export const POST = defineRoute({ perm: "rubric.manage" }, async (req) => {
  const parsed = Schema.safeParse(await readBody(req));
  if (!parsed.success) return badRequest(parsed.error.message);
  const { questionId, criterion, levelsJson } = parsed.data;

  // garante que a questão é discursiva
  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!q || !q.isDiscursive) return badRequest("Rubrics only for discursive questions");

  const r = await prisma.frRubric.create({ data: { questionId, criterion, levelsJson } });
  return json(r, 201);
});
