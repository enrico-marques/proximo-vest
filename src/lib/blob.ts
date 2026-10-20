// The single place that knows how stored files map to URLs. The database and question markdown
// only keep pathnames ("questions/abc-123.png"), so changing storage provider means changing this file.

export const QUESTION_IMAGE_DIR = "questions";
export const QUESTION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const QUESTION_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

// Markdown references stored files as "storage:<pathname>" instead of a provider URL.
export const STORAGE_URL_PREFIX = "storage:";

const QUESTION_IMAGE_PATHNAME = /^questions\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isQuestionImagePathname(pathname: string): boolean {
  return QUESTION_IMAGE_PATHNAME.test(pathname) && !pathname.includes("..");
}

export function isQuestionImageType(contentType: string): boolean {
  return (QUESTION_IMAGE_TYPES as readonly string[]).includes(contentType);
}

/** Pathname for a new upload; the store appends a random suffix to avoid collisions and guessing. */
export function questionImagePathname(fileName: string): string {
  const base =
    fileName
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/^[-.]+/, "")
      .slice(-80) || "imagem";
  return `${QUESTION_IMAGE_DIR}/${base}`;
}

function blobBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_BLOB_BASE_URL is not set");
  return base.replace(/\/+$/, "");
}

export function blobUrl(pathname: string): string {
  return `${blobBaseUrl()}/${pathname.split("/").map(encodeURIComponent).join("/")}`;
}

export function toStorageRef(pathname: string): string {
  return `${STORAGE_URL_PREFIX}${pathname}`;
}

/** Turns "storage:<pathname>" into a public URL; any other src is returned unchanged. */
export function resolveStorageUrl(src: string): string {
  return src.startsWith(STORAGE_URL_PREFIX) ? blobUrl(src.slice(STORAGE_URL_PREFIX.length)) : src;
}

/** True only for URLs served by our blob store, so the server never fetches arbitrary hosts. */
export function isBlobUrl(url: string): boolean {
  return url.startsWith(`${blobBaseUrl()}/`);
}
