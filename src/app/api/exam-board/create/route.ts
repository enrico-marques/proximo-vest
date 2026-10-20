import { prisma } from "../../../../lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { json, readBody, badRequest } from "../../_utils";
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({ slug: z.string().min(2), name: z.string().min(2) });

export const POST = defineRoute({ perm: "examBoard.manage" }, async (req) => {
  const body = Schema.safeParse(await readBody(req));
  if (!body.success) return badRequest(body.error.message);
  const { slug, name } = body.data;
  const created = await prisma.examBoard.create({ data: { slug, name } });
  return json(created, 201);
});
