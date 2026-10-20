import { NextResponse } from "next/server";

import { defineRoute, HttpError } from "@/server/auth/define-route";
import { planUpdateSchema, updatePlan } from "@/server/plans";

export const PATCH = defineRoute<{ id: string }>({ perm: "plan.manage" }, async (req, { params }) => {
  const plan = await updatePlan(params.id, planUpdateSchema.parse(await req.json()));
  if (!plan) throw new HttpError(404, "Plano não encontrado");
  return NextResponse.json(plan);
});
