"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

import {
  QUESTION_IMAGE_MAX_BYTES,
  isQuestionImageType,
  questionImagePathname,
  toStorageRef,
} from "@/lib/blob";

/** Uploads an image for the question markdown editor and returns the reference to embed. */
export function useQuestionImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  async function uploadImage(file: File): Promise<string> {
    // The upload token enforces the same limits; checking first gives a clearer message.
    if (!isQuestionImageType(file.type)) {
      throw new Error("Formato não suportado. Envie JPG, PNG, WebP ou GIF.");
    }
    if (file.size > QUESTION_IMAGE_MAX_BYTES) {
      throw new Error("A imagem deve ter no máximo 10 MB.");
    }

    setIsUploading(true);
    try {
      const blob = await upload(questionImagePathname(file.name), file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: file.type,
      });
      return toStorageRef(blob.pathname);
    } finally {
      setIsUploading(false);
    }
  }

  return { uploadImage, isUploading };
}
