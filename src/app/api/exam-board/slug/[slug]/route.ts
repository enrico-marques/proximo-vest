import { NextRequest } from "next/server";
import { z } from "zod";
import {
  json,
  readBody,
  notFound,
  badRequest,
} from "../../../_utils";
import { defineRoute } from "@/server/auth/define-route";
import { getExamBoardBySlug } from "@/server/exams";

type Params = { slug: string };

const PatchSchema = z.object({
  slug: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
});

export const GET = defineRoute<Params>({ perm: ["examBoard.read", "examBoard.manage"] }, async (req, ctx) => {
  const { slug } = await ctx.params;

  const found = await getExamBoardBySlug(slug);
  if (!found) return notFound("ExamBoard not found");
  return json(found);
});
