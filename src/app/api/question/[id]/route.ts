import { prisma } from "../../../../lib/prisma";
import { json, notFound, badRequest } from "../../_utils";
import { defineRoute } from "@/server/auth/define-route";
import { QUESTION_READ, getQuestionDetail, questionUpdateSchema, updateQuestion } from "@/server/questions";


type Params = { id: string };

export const GET = defineRoute<Params>({ perm: QUESTION_READ }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  const found = await getQuestionDetail(id);
  if (!found) return notFound("Question not found");
  return json(found);
});

export const PATCH = defineRoute<Params>({ perm: "question.update" }, async (req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  const input = questionUpdateSchema.parse(await req.json());
  return json(await updateQuestion(id, input));
});

export const DELETE = defineRoute<Params>({ perm: "question.delete" }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  await prisma.question.delete({ where: { id } });
  return json({ ok: true });
});
