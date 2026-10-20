import { NextResponse } from "next/server";

import { defineRoute } from "@/server/auth/define-route";

// The login form calls this right after sign-in to route unverified or inactive accounts.
export const GET = defineRoute(
  { emailVerified: false, allowInactiveAccount: true },
  async (_req, { user, profile }) => {
    return NextResponse.json({
      userId: user.id,
      emailVerified: profile.emailVerified,
      status: profile.status,
      roles: profile.roles,
      perms: profile.perms,
    });
  },
);
