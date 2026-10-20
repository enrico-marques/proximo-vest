import { NextRequest, NextResponse } from "next/server";

export function json(data: unknown, init?: number | ResponseInit) {
  const status = typeof init === "number" ? init : (init as ResponseInit)?.status ?? 200;
  const headers = typeof init === "number" ? {} : (init as ResponseInit)?.headers ?? {};
  return NextResponse.json(data, { status, headers });
}

export async function readBody<T>(req: NextRequest): Promise<T> {
  return (await req.json()) as T;
}

export function badRequest(message: string) {
  return json({ error: { code: "BAD_REQUEST", message } }, 400);
}
export function notFound(message = "Not found") {
  return json({ error: { code: "NOT_FOUND", message } }, 404);
}
export function conflict(message: string) {
  return json({ error: { code: "CONFLICT", message } }, 409);
}
