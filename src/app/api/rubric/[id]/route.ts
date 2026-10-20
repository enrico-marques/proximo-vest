import { prisma } from "../../../../lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { json, readBody, badRequest, notFound } from "../../_utils";
import { defineRoute } from "@/server/auth/define-route";

type Params = { id: string };

const PatchSchema = z.object({
  criterion: z.string().optional(),
  levelsJson: z.record(z.string(), z.string()).optional(),
});

export const PATCH = defineRoute<Params>({ perm: "rubric.manage" }, async (req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  const parsed = PatchSchema.safeParse(await readBody(req));
  if (!parsed.success) return badRequest(parsed.error.message);

  const found = await prisma.frRubric.findUnique({ where: { id } });
  if (!found) return notFound("Rubric not found");

  const updated = await prisma.frRubric.update({
    where: { id },
    data: parsed.data,
  });

  return json(updated);
});

export const DELETE = defineRoute<Params>({ perm: "rubric.manage" }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  await prisma.frRubric.delete({ where: { id } });
  return json({ ok: true });
});
