import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { defineRoute } from "@/server/auth/define-route";

// Lista sessões ativas do usuário logado
export const GET = defineRoute({ emailVerified: false }, async (req) => {
  const sessions = await auth.api.listSessions({ headers: req.headers });
  return NextResponse.json(sessions);
});

// Revoga TODAS as sessões do usuário logado (incluindo a atual)
export const POST = defineRoute({ emailVerified: false }, async (req) => {
  await auth.api.revokeSessions({ headers: req.headers });
  return NextResponse.json({ ok: true });
});
