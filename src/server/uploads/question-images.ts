import {
  QUESTION_IMAGE_MAX_BYTES,
  QUESTION_IMAGE_TYPES,
  isQuestionImagePathname,
} from "@/lib/blob";
import { HttpError } from "@/server/auth/define-route";

const TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * Restrictions baked into the client upload token: Vercel Blob enforces type and size on its side,
 * so a client that skips our UI checks still cannot upload anything else.
 */
export function questionImageTokenOptions(pathname: string, now = Date.now()) {
  if (!isQuestionImagePathname(pathname)) {
    throw new HttpError(400, "Caminho de imagem inválido");
  }

  return {
    allowedContentTypes: [...QUESTION_IMAGE_TYPES],
    maximumSizeInBytes: QUESTION_IMAGE_MAX_BYTES,
    addRandomSuffix: true,
    validUntil: now + TOKEN_TTL_MS,
  };
}
