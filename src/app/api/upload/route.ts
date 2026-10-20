import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { HttpError, defineRoute } from "@/server/auth/define-route";
import { questionImageTokenOptions } from "@/server/uploads/question-images";

// Issues client upload tokens for question images (markdown editor). No onUploadCompleted is
// registered: the editor gets the pathname back from the upload itself, and a completion webhook
// would have to be reachable without a session.
export const POST = defineRoute({ perm: ["question.create", "question.update"] }, async (req) => {
  const body = (await req.json()) as HandleUploadBody;
  if (body?.type !== "blob.generate-client-token") {
    throw new HttpError(400, "Requisição de upload inválida");
  }

  const result = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (pathname) => questionImageTokenOptions(pathname),
  });

  return NextResponse.json(result);
});
