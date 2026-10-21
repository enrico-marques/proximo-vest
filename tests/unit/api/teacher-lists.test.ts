import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/server/auth/define-route";

const getSession = vi.fn();
const getAuthProfile = vi.fn();
const consumeUsage = vi.fn();
const db = {
  question: { findMany: vi.fn() },
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
vi.mock("@/server/limits", () => ({ consumeUsage: (...a: unknown[]) => consumeUsage(...a) }));

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
  publishedQuestions([1, 2]);
});

function publishedQuestions(ids: number[]) {
  db.question.findMany.mockImplementation(async ({ where }: { where: { id: { in: number[] } } }) =>
    where.id.in.filter((id) => ids.includes(id)).map((id) => ({ id })),
  );
}

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
    expect(consumeUsage).toHaveBeenCalledWith(TEACHER.id, "TEACHER_LIST", db);
  });

  it("does not create a list once the plan limit is reached", async () => {
    signedIn();
    consumeUsage.mockRejectedValue(new HttpError(403, "limite"));

    const res = await lists.POST(
      request("POST", { name: "Lista 6", teacherName: "Prof", questionIds: [1] }),
      noParams,
    );

    expect(res.status).toBe(403);
    expect(db.teacherList.create).not.toHaveBeenCalled();
  });

  it("rejects a list with a question that is not published, without spending usage", async () => {
    signedIn();
    publishedQuestions([1]);

    const res = await lists.POST(
      request("POST", { name: "Lista 1", teacherName: "Prof", questionIds: [1, 3] }),
      noParams,
    );

    expect(res.status).toBe(400);
    expect(consumeUsage).not.toHaveBeenCalled();
    expect(db.teacherList.create).not.toHaveBeenCalled();
  });

  it("stores each question once, in the order first sent", async () => {
    signedIn();
    db.teacherList.create.mockResolvedValue({ id: "new" });

    await lists.POST(
      request("POST", { name: "Lista 1", teacherName: "Prof", questionIds: [2, 1, 2] }),
      noParams,
    );

    expect(db.teacherListQuestion.createMany).toHaveBeenCalledWith({
      data: [
        { listId: "new", questionId: 2, order: 1 },
        { listId: "new", questionId: 1, order: 2 },
      ],
    });
  });

  it("does not rewrite a list's questions when one is not published", async () => {
    signedIn();
    publishedQuestions([1]);
    db.teacherList.findFirst.mockResolvedValue({ id: "mine", name: "L", description: null, teacherName: "P" });
    db.teacherList.update.mockResolvedValue({ id: "mine" });

    const res = await list.PUT(request("PUT", { questionIds: [1, 2] }), params({ id: "mine" }));

    expect(res.status).toBe(400);
    expect(db.teacherListQuestion.deleteMany).not.toHaveBeenCalled();
    expect(db.teacherListQuestion.createMany).not.toHaveBeenCalled();
  });

  it("duplicates only the published questions and reports how many were left out", async () => {
    signedIn();
    publishedQuestions([1, 2]);
    db.teacherList.findFirst.mockResolvedValue({
      id: "mine",
      name: "Lista",
      description: null,
      teacherId: TEACHER.id,
      teacherName: "Prof",
      questions: [
        { questionId: 2, order: 1 },
        { questionId: 7, order: 2 }, // a draft
        { questionId: 1, order: 3 },
      ],
    });
    db.teacherList.create.mockResolvedValue({ id: "copy" });

    const res = await duplicate.POST(request("POST"), params({ id: "mine" }));

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id: "copy", omittedQuestions: 1 });
    expect(db.teacherListQuestion.createMany).toHaveBeenCalledWith({
      data: [
        { listId: "copy", questionId: 2, order: 1 },
        { listId: "copy", questionId: 1, order: 2 },
      ],
    });
  });

  it.each([
    ["GET", () => list.GET(request(), params({ id: "other" }))],
    ["PUT", () => list.PUT(request("PUT", { name: "Hack" }), params({ id: "other" }))],
    ["DELETE", () => list.DELETE(request("DELETE"), params({ id: "other" }))],
    ["duplicate", () => duplicate.POST(request("POST"), params({ id: "other" }))],
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
