// API routes answer errors as { error: { message } } (defineRoute) or { error: string } (older
// handlers). Reads either shape so the UI can show the server's message.
export async function readApiError(res: Response, fallback: string) {
  const body: unknown = await res.json().catch(() => null);
  if (!body || typeof body !== "object" || !("error" in body)) return fallback;

  const { error } = body;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}
