import { request, type APIRequestContext } from "@playwright/test";

// better-auth rate-limits sign-in per client IP (3 per 10s), read from x-forwarded-for.
// Each test group acts as its own client so groups do not throttle each other.
export function asClient(ip: string) {
  return { extraHTTPHeaders: { "x-forwarded-for": ip } };
}

export async function signedInContext(
  baseURL: string,
  ip: string,
  credentials: { email: string; password: string },
): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL, ...asClient(ip) });
  const res = await ctx.post("/api/auth/sign-in/email", { data: credentials });
  if (!res.ok()) throw new Error(`sign-in failed for ${credentials.email}: ${res.status()}`);
  return ctx;
}
