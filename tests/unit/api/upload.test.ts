import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getAuthProfile = vi.fn();
const handleUpload = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));
vi.mock("@/utils/access", () => ({ getAuthProfile: (...a: unknown[]) => getAuthProfile(...a) }));
vi.mock("@vercel/blob/client", () => ({ handleUpload: (...a: unknown[]) => handleUpload(...a) }));

const { POST } = await import("@/app/api/upload/route");

type TokenOptions = { allowedContentTypes: string[]; maximumSizeInBytes: number; addRandomSuffix: boolean };
type HandleUploadArgs = {
  body: { payload: { pathname: string } };
  onBeforeGenerateToken: (pathname: string) => Promise<TokenOptions>;
};

function signedIn(perms: string[]) {
  getSession.mockResolvedValue({ user: { id: "u1", email: "a@b.c", name: "A" } });
  getAuthProfile.mockResolvedValue({ emailVerified: true, status: "active", roles: [], perms });
}

const tokenRequest = (pathname: string) =>
  new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: { pathname, clientPayload: null, multipart: false },
    }),
  });
const noParams = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.resetAllMocks();
  // Mirrors the SDK: ask our callback for the token restrictions, then return a token.
  handleUpload.mockImplementation(async ({ body, onBeforeGenerateToken }: HandleUploadArgs) => {
    const options = await onBeforeGenerateToken(body.payload.pathname);
    return { type: "blob.generate-client-token", clientToken: "token", options };
  });
});

const send = (pathname: string) => POST(tokenRequest(pathname), noParams);

describe("question image upload route", () => {
  it("requires a session", async () => {
    getSession.mockResolvedValue(null);
    expect((await send("questions/a.png")).status).toBe(401);
    expect(handleUpload).not.toHaveBeenCalled();
  });

  it("requires a question editing permission", async () => {
    signedIn(["teacherList.manage"]);
    expect((await send("questions/a.png")).status).toBe(403);
    expect(handleUpload).not.toHaveBeenCalled();
  });

  it("issues a token restricted to images up to 10 MB with a random suffix", async () => {
    signedIn(["question.update"]);
    const res = await send("questions/grafico.png");

    expect(res.status).toBe(200);
    const { options } = await res.json();
    expect(options).toMatchObject({
      allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      maximumSizeInBytes: 10 * 1024 * 1024,
      addRandomSuffix: true,
    });
  });

  it("refuses pathnames outside the question images folder", async () => {
    signedIn(["question.create"]);
    expect((await send("avatars/x.png")).status).toBe(400);
    expect((await send("questions/../x.png")).status).toBe(400);
  });

  it("refuses upload-completed webhooks, which this route never registers", async () => {
    signedIn(["question.create"]);
    const res = await POST(
      new NextRequest("http://localhost/api/upload", {
        method: "POST",
        body: JSON.stringify({ type: "blob.upload-completed", payload: {} }),
      }),
      noParams,
    );

    expect(res.status).toBe(400);
    expect(handleUpload).not.toHaveBeenCalled();
  });
});
