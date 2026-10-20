// app/api/exam-board/[id]/route.ts
import { prisma } from "../../../../lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { json, readBody, notFound, badRequest } from "../../_utils";
import { defineRoute } from "@/server/auth/define-route";

type Params = { id: string };

const PatchSchema = z.object({
  slug: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
});

export const GET = defineRoute<Params>({ perm: ["examBoard.read", "examBoard.manage"] }, async (req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  const found = await prisma.examBoard.findUnique({ where: { id } });
  if (!found) return notFound("ExamBoard not found");
  return json(found);
});

export const PATCH = defineRoute<Params>({ perm: "examBoard.manage" }, async (req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  const parsed = PatchSchema.safeParse(await readBody(req));
  if (!parsed.success) return badRequest(parsed.error.message);

  const updated = await prisma.examBoard.update({
    where: { id },
    data: parsed.data,
  });
  return json(updated);
});

export const DELETE = defineRoute<Params>({ perm: "examBoard.manage" }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  await prisma.examBoard.delete({ where: { id } });
  return json({ ok: true });
});
