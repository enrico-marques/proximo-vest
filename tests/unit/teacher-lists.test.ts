import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getAuthProfile = vi.fn();
const db = {
  question: { findMany: vi.fn() },
  teacherList: { findFirst: vi.fn() },
};

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));
vi.mock("@/utils/access", () => ({ getAuthProfile: (...a: unknown[]) => getAuthProfile(...a) }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { resolvePublishedQuestionIds } = await import("@/server/teacher-lists");
const { HttpError } = await import("@/server/auth/define-route");
const pdf = await import("@/app/api/teacher-lists/[id]/pdf/route");

// Mirrors the database: only ids in `published` match `status: PUBLISHED`.
function questionsInDb(published: number[]) {
  db.question.findMany.mockImplementation(async ({ where }: { where: { id: { in: number[] } } }) =>
    where.id.in.filter((id) => published.includes(id)).map((id) => ({ id })),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("resolvePublishedQuestionIds", () => {
  it("accepts published questions and keeps their order", async () => {
    questionsInDb([1, 2, 3]);

    await expect(resolvePublishedQuestionIds([3, 1, 2])).resolves.toEqual([3, 1, 2]);
    expect(db.question.findMany).toHaveBeenCalledWith({
      where: { id: { in: [3, 1, 2] }, status: "PUBLISHED" },
      select: { id: true },
    });
  });

  it("drops duplicates, keeping the first position", async () => {
    questionsInDb([1, 2]);

    await expect(resolvePublishedQuestionIds([2, 1, 2, 1])).resolves.toEqual([2, 1]);
  });

  it("rejects a draft question", async () => {
    questionsInDb([1]); // question 2 exists as a draft, so the PUBLISHED filter leaves it out

    const err = await resolvePublishedQuestionIds([1, 2]).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({ status: 400, message: expect.stringContaining("2") });
  });

  it("rejects an id that does not exist", async () => {
    questionsInDb([1]);

    await expect(resolvePublishedQuestionIds([1, 999])).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("999"),
    });
  });

  it("does not query the database for an empty list", async () => {
    await expect(resolvePublishedQuestionIds([])).resolves.toEqual([]);
    expect(db.question.findMany).not.toHaveBeenCalled();
  });
});

describe("teacher list PDF", () => {
  it("only renders questions that are still published", async () => {
    getSession.mockResolvedValue({ user: { id: "teacher-1", email: "p@example.com", name: "Prof" } });
    getAuthProfile.mockResolvedValue({
      emailVerified: true,
      status: "active",
      roles: ["Professor"],
      perms: ["teacherList.manage"],
    });
    db.teacherList.findFirst.mockResolvedValue({
      id: "list-1",
      name: "Lista",
      description: null,
      teacherName: "Prof",
      questions: [],
    });

    const res = await pdf.GET(new NextRequest("http://localhost/api/teacher-lists/list-1/pdf"), {
      params: Promise.resolve({ id: "list-1" }),
    });

    expect(res.status).toBe(200);
    expect(db.teacherList.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "list-1", teacherId: "teacher-1" },
        include: {
          questions: expect.objectContaining({ where: { question: { status: "PUBLISHED" } } }),
        },
      }),
    );
  });
});
