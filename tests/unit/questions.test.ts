import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  question: { findMany: vi.fn(), count: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { listQuestions, questionPageSchema } = await import("@/server/questions");

beforeEach(() => {
  vi.resetAllMocks();
  db.question.findMany.mockResolvedValue([]);
});

describe("listQuestions pagination", () => {
  it("fetches one page with a single count and a single data query", async () => {
    db.question.count.mockResolvedValue(45);

    const result = await listQuestions({ examPhaseId: 7, page: 2, pageSize: 20 });

    expect(result).toMatchObject({ total: 45, page: 2, pageSize: 20, pageCount: 3 });
    expect(db.question.count).toHaveBeenCalledTimes(1);
    expect(db.question.findMany).toHaveBeenCalledTimes(1);
    expect(db.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { examPhaseId: 7 }, skip: 20, take: 20 }),
    );
  });

  it("breaks ties by id so pages are stable", async () => {
    db.question.count.mockResolvedValue(0);

    await listQuestions({ examPhaseId: 7 });

    expect(db.question.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ numberLabel: "asc" }, { id: "asc" }] }),
    );
  });

  it("reports one page for an empty phase", async () => {
    db.question.count.mockResolvedValue(0);

    await expect(listQuestions({ examPhaseId: 7 })).resolves.toMatchObject({ pageCount: 1 });
  });
});

describe("questionPageSchema", () => {
  it("falls back instead of failing on bad search params", () => {
    expect(questionPageSchema.parse({ page: "abc", pageSize: "5000" })).toEqual({ page: 1, pageSize: 20 });
    expect(questionPageSchema.parse({ page: ["2", "3"] })).toEqual({ page: 1, pageSize: 20 });
    expect(questionPageSchema.parse({ page: "3", pageSize: "50" })).toEqual({ page: 3, pageSize: 50 });
  });
});
