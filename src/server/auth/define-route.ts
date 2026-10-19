import { NextResponse, type NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { getAuthProfile } from "@/utils/access";
import { can, type AuthProfile, type PermissionKey, type RoleName } from "@/utils/access-core";

/**
 * Every API route must be built with `defineRoute`. The default is closed:
 * a route is only reachable without a session when it is declared "public".
 */
export type RouteAccess = "public" | AuthRequirement;

export type AuthRequirement = {
  /** Any of the listed permissions grants access. */
  perm?: PermissionKey | PermissionKey[];
  /** Any of the listed roles grants access. */
  role?: RoleName | RoleName[];
  /** Defaults to true. Only flows a not-yet-verified user must reach should opt out. */
  emailVerified?: boolean;
  /** Lets suspended/deleted accounts through, so the client can show them their status. */
  allowInactiveAccount?: boolean;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

type RouteParams = Record<string, string | string[]>;

type NextRouteContext<P extends RouteParams> = { params: Promise<P> };

type PublicContext<P extends RouteParams> = { params: P };

type AuthenticatedContext<P extends RouteParams> = {
  params: P;
  user: AuthenticatedUser;
  profile: AuthProfile;
};

type Handler<C> = (req: NextRequest, ctx: C) => Response | Promise<Response>;

type RouteHandler<P extends RouteParams> = (
  req: NextRequest,
  ctx: NextRouteContext<P>,
) => Promise<Response>;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function authorize(
  req: NextRequest,
  requirement: AuthRequirement,
): Promise<{ user: AuthenticatedUser; profile: AuthProfile } | Response> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) return deny(401, "Unauthorized");

  const profile = await getAuthProfile(session.user.id);
  if (!profile) return deny(401, "Unauthorized");

  if (!requirement.allowInactiveAccount) {
    if (profile.status === "deleted") return deny(403, "DeletedAccount");
    if (profile.status === "suspended") return deny(403, "Suspended");
  }

  const requireVerified = requirement.emailVerified ?? true;
  if (requireVerified && !profile.emailVerified) return deny(403, "EmailNotVerified");

  if (!can(profile, { perm: requirement.perm, role: requirement.role })) {
    return deny(403, "Forbidden");
  }

  return {
    user: { id: session.user.id, email: session.user.email, name: session.user.name },
    profile,
  };
}

function toErrorResponse(err: unknown) {
  unstable_rethrow(err);

  if (err instanceof HttpError) {
    return NextResponse.json({ error: { message: err.message } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { message: "Dados inválidos", issues: err.issues } },
      { status: 400 },
    );
  }

  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: { message: "Erro interno" } }, { status: 500 });
}

export function defineRoute<P extends RouteParams = RouteParams>(
  access: "public",
  handler: Handler<PublicContext<P>>,
): RouteHandler<P>;
export function defineRoute<P extends RouteParams = RouteParams>(
  access: AuthRequirement,
  handler: Handler<AuthenticatedContext<P>>,
): RouteHandler<P>;
export function defineRoute<P extends RouteParams>(
  access: RouteAccess,
  handler: Handler<PublicContext<P>> | Handler<AuthenticatedContext<P>>,
): RouteHandler<P> {
  return async (req, ctx) => {
    try {
      // Static routes may be invoked without a params promise.
      const params = ((await ctx?.params) ?? {}) as P;

      if (access === "public") {
        return await (handler as Handler<PublicContext<P>>)(req, { params });
      }

      const result = await authorize(req, access);
      if (result instanceof Response) return result;

      return await (handler as Handler<AuthenticatedContext<P>>)(req, { params, ...result });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
