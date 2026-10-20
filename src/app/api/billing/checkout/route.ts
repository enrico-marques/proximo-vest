import { NextResponse } from "next/server";

import { defineRoute } from "@/server/auth/define-route";
import { checkoutInputSchema, startCheckout } from "@/server/billing";

export const POST = defineRoute({}, async (req, { user }) => {
  const url = await startCheckout(user, checkoutInputSchema.parse(await req.json()));
  return NextResponse.json({ url });
});
