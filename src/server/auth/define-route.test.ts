import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { AuthProfile } from "@/utils/access-core";

const getSession = vi.fn();
const getAuthProfile = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...args: unknown[]) => getSession(...args) } } }));
vi.mock("@/utils/access", () => ({ getAuthProfile: (...args: unknown[]) => getAuthProfile(...args) }));

const { defineRoute, HttpError } = await import("./define-route");

const USER = { id: "user-1", email: "ana@example.com", name: "Ana" };

function profile(overrides: Partial<AuthProfile> = {}): AuthProfile {
  return { emailVerified: true, status: "active", roles: [], perms: [], ...overrides };
}

function signedIn(overrides: Partial<AuthProfile> = {}) {
  getSession.mockResolvedValue({ user: USER, session: { id: "s1" } });
  getAuthProfile.mockResolvedValue(profile(overrides));
}

const req = () => new NextRequest("http://localhost/api/test", { method: "POST" });
const ctx = <P extends Record<string, string>>(params: P = {} as P) => ({ params: Promise.resolve(params) });
const ok = vi.fn(async () => Response.json({ ok: true }));

beforeEach(() => {
  getSession.mockReset();
  getAuthProfile.mockReset();
  ok.mockClear();
});

describe("defineRoute", () => {
  describe("public routes", () => {
    it("run without a session and never look one up", async () => {
      const handler = vi.fn(async () => new Response("hi"));
      const res = await defineRoute("public", handler)(req(), ctx({ slug: "enem" }));

      expect(res.status).toBe(200);
      expect(getSession).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith(expect.any(NextRequest), { params: { slug: "enem" } });
    });
  });

  describe("protected routes", () => {
    it("return 401 without a session", async () => {
      getSession.mockResolvedValue(null);
      const res = await defineRoute({}, ok)(req(), ctx());

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
      expect(ok).not.toHaveBeenCalled();
    });

    it("return 401 when the session user no longer exists", async () => {
      getSession.mockResolvedValue({ user: USER });
      getAuthProfile.mockResolvedValue(null);

      expect((await defineRoute({}, ok)(req(), ctx())).status).toBe(401);
      expect(ok).not.toHaveBeenCalled();
    });

    it("check the session using the incoming request headers", async () => {
      signedIn();
      const request = req();
      await defineRoute({}, ok)(request, ctx());

      expect(getSession).toHaveBeenCalledWith({ headers: request.headers });
      expect(getAuthProfile).toHaveBeenCalledWith(USER.id);
    });

    it.each([
      ["suspended", "Suspended"],
      ["deleted", "DeletedAccount"],
    ] as const)("return 403 for %s accounts", async (status, error) => {
      signedIn({ status });
      const res = await defineRoute({}, ok)(req(), ctx());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error });
      expect(ok).not.toHaveBeenCalled();
    });

    it("let inactive accounts through only when the route opts in", async () => {
      signedIn({ status: "suspended" });
      expect((await defineRoute({ allowInactiveAccount: true }, ok)(req(), ctx())).status).toBe(200);
    });

    it("require a verified e-mail by default", async () => {
      signedIn({ emailVerified: false });
      const res = await defineRoute({}, ok)(req(), ctx());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "EmailNotVerified" });
    });

    it("allow unverified e-mail when the route opts out", async () => {
      signedIn({ emailVerified: false });
      expect((await defineRoute({ emailVerified: false }, ok)(req(), ctx())).status).toBe(200);
    });

    it("return 403 when the permission is missing", async () => {
      signedIn({ perms: ["question.read"] });
      const res = await defineRoute({ perm: "question.update" }, ok)(req(), ctx());

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden" });
      expect(ok).not.toHaveBeenCalled();
    });

    it("accept any one of several permissions", async () => {
      signedIn({ perms: ["plan.manage"] });
      expect((await defineRoute({ perm: ["plan.read", "plan.manage"] }, ok)(req(), ctx())).status).toBe(200);
    });

    it("check roles", async () => {
      signedIn({ roles: ["Professor"] });
      expect((await defineRoute({ role: "Admin" }, ok)(req(), ctx())).status).toBe(403);

      signedIn({ roles: ["Admin"] });
      expect((await defineRoute({ role: "Admin" }, ok)(req(), ctx())).status).toBe(200);
    });

    it("hand the verified user, profile and resolved params to the handler", async () => {
      signedIn({ perms: ["teacherList.manage"] });
      const handler = vi.fn(async () => new Response(null, { status: 204 }));

      await defineRoute<{ id: string }>({ perm: "teacherList.manage" }, handler)(req(), ctx({ id: "list-9" }));

      expect(handler).toHaveBeenCalledWith(expect.any(NextRequest), {
        params: { id: "list-9" },
        user: USER,
        profile: profile({ perms: ["teacherList.manage"] }),
      });
    });
  });

  describe("errors thrown by handlers", () => {
    it("map HttpError to its status", async () => {
      const res = await defineRoute("public", async () => {
        throw new HttpError(404, "Lista não encontrada");
      })(req(), ctx());

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: { message: "Lista não encontrada" } });
    });

    it("map Zod validation errors to 400", async () => {
      const res = await defineRoute("public", async () => {
        z.object({ name: z.string() }).parse({});
        return new Response();
      })(req(), ctx());

      expect(res.status).toBe(400);
      expect((await res.json()).error.issues).toHaveLength(1);
    });

    it.each([
      ["P2025", 404],
      ["P2002", 409],
      ["P2003", 409],
    ])("map Prisma %s to %i without the database message", async (code, status) => {
      const res = await defineRoute("public", async () => {
        throw new Prisma.PrismaClientKnownRequestError("Invalid prisma.x.update() table secret_t", {
          code,
          clientVersion: "test",
        });
      })(req(), ctx());

      expect(res.status).toBe(status);
      expect(JSON.stringify(await res.json())).not.toContain("secret");
    });

    it("map a malformed JSON body to 400", async () => {
      const res = await defineRoute("public", async (r) => Response.json(await r.json()))(
        new NextRequest("http://localhost/api/test", { method: "POST", body: "{nope" }),
        ctx(),
      );
      expect(res.status).toBe(400);
    });

    it("return 500 without leaking the internal message", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await defineRoute("public", async () => {
        throw new Error("connection string postgres://secret");
      })(req(), ctx());

      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toContain("secret");
      expect(spy).toHaveBeenCalled();
    });
  });
});
