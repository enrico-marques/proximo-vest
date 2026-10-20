import { NextResponse } from "next/server";

import { defineRoute } from "@/server/auth/define-route";
import { listPlans, toPublicPlan } from "@/server/plans";

// Public: feeds pricing pages. Only fields meant for visitors leave the server.
export const GET = defineRoute("public", async () => {
  const plans = await listPlans();
  return NextResponse.json(plans.map(toPublicPlan));
});
