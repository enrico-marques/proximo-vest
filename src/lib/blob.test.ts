import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  blobUrl,
  isBlobUrl,
  isQuestionImagePathname,
  isQuestionImageType,
  questionImagePathname,
  resolveStorageUrl,
  toStorageRef,
} from "./blob";

const BASE = "https://store123.public.blob.vercel-storage.com";

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_BLOB_BASE_URL", BASE));
afterEach(() => vi.unstubAllEnvs());

describe("question image pathnames", () => {
  it.each(["questions/grafico.png", "questions/enem-2023_q12-AbC123.webp"])("accepts %s", (p) => {
    expect(isQuestionImagePathname(p)).toBe(true);
  });

  it.each([
    "grafico.png",
    "avatars/grafico.png",
    "questions/../secrets.png",
    "questions/sub/dir.png",
    "questions/.hidden.png",
    "questions/",
    "/questions/a.png",
  ])("rejects %s", (p) => {
    expect(isQuestionImagePathname(p)).toBe(false);
  });

  it("builds safe upload pathnames from arbitrary file names", () => {
    expect(questionImagePathname("Gráfico da questão 1.png")).toBe("questions/Gra-fico-da-questa-o-1.png");
    expect(questionImagePathname("../../etc/passwd")).toBe("questions/etc-passwd");
    expect(questionImagePathname("...")).toBe("questions/imagem");
    expect(isQuestionImagePathname(questionImagePathname("../../x y.png"))).toBe(true);
  });

  it("only allows raster image types", () => {
    expect(isQuestionImageType("image/png")).toBe(true);
    expect(isQuestionImageType("image/svg+xml")).toBe(false);
    expect(isQuestionImageType("text/html")).toBe(false);
  });
});

describe("storage URLs", () => {
  it("resolves storage references and leaves other sources alone", () => {
    expect(resolveStorageUrl(toStorageRef("questions/a b.png"))).toBe(`${BASE}/questions/a%20b.png`);
    expect(resolveStorageUrl("https://example.com/x.png")).toBe("https://example.com/x.png");
  });

  it("tolerates a trailing slash in the configured base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_BLOB_BASE_URL", `${BASE}/`);
    expect(blobUrl("questions/a.png")).toBe(`${BASE}/questions/a.png`);
  });

  it("recognises only our store as fetchable", () => {
    expect(isBlobUrl(`${BASE}/questions/a.png`)).toBe(true);
    expect(isBlobUrl(`${BASE}.evil.com/questions/a.png`)).toBe(false);
    expect(isBlobUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
  });

  it("fails loudly when the base URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_BLOB_BASE_URL", "");
    expect(() => blobUrl("questions/a.png")).toThrow(/NEXT_PUBLIC_BLOB_BASE_URL/);
  });
});
