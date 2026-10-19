import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getAuthProfile = vi.fn();
const db = {
  teacherList: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  teacherListQuestion: { createMany: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));
vi.mock("@/utils/access", () => ({ getAuthProfile: (...a: unknown[]) => getAuthProfile(...a) }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const lists = await import("@/app/api/teacher-lists/route");
const list = await import("@/app/api/teacher-lists/[id]/route");
const duplicate = await import("@/app/api/teacher-lists/[id]/duplicate/route");

const TEACHER = { id: "teacher-1", email: "prof@example.com", name: "Prof" };

function signedIn(perms: string[] = ["teacherList.manage"]) {
  getSession.mockResolvedValue({ user: TEACHER });
  getAuthProfile.mockResolvedValue({ emailVerified: true, status: "active", roles: ["Professor"], perms });
}

const request = (method = "GET", body?: unknown) =>
  new NextRequest("http://localhost/api/teacher-lists", {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });
const params = <P extends Record<string, string>>(p: P) => ({ params: Promise.resolve(p) });
const noParams = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
});

describe("teacher lists authorization", () => {
  it("rejects anonymous requests before touching the database", async () => {
    getSession.mockResolvedValue(null);

    expect((await lists.GET(request(), noParams)).status).toBe(401);
    expect((await list.DELETE(request("DELETE"), params({ id: "x" }))).status).toBe(401);
    expect(db.teacherList.findMany).not.toHaveBeenCalled();
    expect(db.teacherList.findFirst).not.toHaveBeenCalled();
  });

  it("rejects signed-in users without teacherList.manage", async () => {
    signedIn([]);
    expect((await lists.GET(request(), noParams)).status).toBe(403);
    expect(db.teacherList.findMany).not.toHaveBeenCalled();
  });

  it("lists only the signed-in teacher's lists", async () => {
    signedIn();
    db.teacherList.findMany.mockResolvedValue([]);

    expect((await lists.GET(request(), noParams)).status).toBe(200);
    expect(db.teacherList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teacherId: TEACHER.id } }),
    );
  });

  it("creates lists owned by the signed-in teacher", async () => {
    signedIn();
    db.teacherList.create.mockResolvedValue({ id: "new" });

    const res = await lists.POST(
      request("POST", { name: "Lista 1", teacherName: "Prof", questionIds: [1, 2] }),
      noParams,
    );

    expect(res.status).toBe(201);
    expect(db.teacherList.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ teacherId: TEACHER.id }),
    });
  });

  it.each([
    ["GET", () => list.GET(request(), params({ id: "other" }))],
    ["PUT", () => list.PUT(request("PUT", { name: "Hack" }), params({ id: "other" }))],
    ["DELETE", () => list.DELETE(request("DELETE"), params({ id: "other" }))],
    ["duplicate", () => duplicate.GET(request(), params({ id: "other" }))],
  ])("%s on another teacher's list is a 404 and changes nothing", async (_name, call) => {
    signedIn();
    db.teacherList.findFirst.mockResolvedValue(null);

    expect((await call()).status).toBe(404);
    expect(db.teacherList.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "other", teacherId: TEACHER.id } }),
    );
    expect(db.teacherList.update).not.toHaveBeenCalled();
    expect(db.teacherList.delete).not.toHaveBeenCalled();
    expect(db.teacherList.create).not.toHaveBeenCalled();
  });
});
