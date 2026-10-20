import { NextResponse } from "next/server";
import { APIError } from "better-auth/api";

import { auth } from "@/lib/auth";
import { defineRoute } from "@/server/auth/define-route";

// Public so that a stale or already-revoked session can still "log out" without an error.
export const POST = defineRoute("public", async (req) => {
  try {
    await auth.api.signOut({ headers: req.headers });
  } catch (err) {
    if (!(err instanceof APIError)) throw err;
  }

  return new NextResponse(null, { status: 204 });
});
