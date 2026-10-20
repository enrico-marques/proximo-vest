// API routes answer errors as { error: { message } } (defineRoute) or { error: string } (older
// handlers). These read either shape so the UI can show the server's message.
export function apiErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object" || !("error" in body)) return fallback;

  const { error } = body;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export async function readApiError(res: Response, fallback: string) {
  return apiErrorMessage(await res.json().catch(() => null), fallback);
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : undefined;
}
