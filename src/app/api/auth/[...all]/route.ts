import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { defineRoute } from "@/server/auth/define-route";

// better-auth owns sign-in, sign-up, verification and password reset; it enforces its own checks.
const handlers = toNextJsHandler(auth);

export const GET = defineRoute("public", (req) => handlers.GET(req));
export const POST = defineRoute("public", (req) => handlers.POST(req));
