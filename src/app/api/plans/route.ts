import { NextResponse } from "next/server";

import { defineRoute } from "@/server/auth/define-route";
import { createPlan, listPlans, planInputSchema } from "@/server/plans";

export const GET = defineRoute({ perm: ["plan.read", "plan.manage"] }, async () => {
  return NextResponse.json(await listPlans({ includeInactive: true }));
});

export const POST = defineRoute({ perm: "plan.manage" }, async (req) => {
  const input = planInputSchema.parse(await req.json());
  return NextResponse.json(await createPlan(input), { status: 201 });
});
