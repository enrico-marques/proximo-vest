import { beforeEach, describe, expect, it, vi } from "vitest";

// Writes made inside a transaction only count once its callback finishes, like a real rollback.
let pending: string[] = [];
let committed: string[] = [];
const write = (name: string, result: unknown = {}) =>
  vi.fn(async () => {
    pending.push(name);
    return result;
  });

const tx = {
  question: { findUnique: vi.fn(), update: vi.fn() },
  subject: { findMany: vi.fn() },
  skill: { findMany: vi.fn() },
  mcqItem: { upsert: vi.fn() },
  mcqOption: { deleteMany: vi.fn(), createMany: vi.fn() },
  frItem: { upsert: vi.fn() },
  frAnswerExpected: { deleteMany: vi.fn(), createMany: vi.fn() },
};
const db = {
  question: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  mcqOption: { createMany: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { listQuestions, questionPageSchema, questionUpdateSchema, updateQuestion } = await import(
  "@/server/questions"
);

beforeEach(() => {
  vi.resetAllMocks();
  pending = [];
  committed = [];
  db.question.findMany.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (fn: (client: typeof tx) => unknown) => {
    pending = [];
    const result = await fn(tx);
    committed.push(...pending);
    return result;
  });
  tx.question.findUnique.mockResolvedValue({ stimulusId: 1 });
  tx.question.update.mockImplementation(write("question.update", { isDiscursive: false }));
  tx.subject.findMany.mockResolvedValue([]);
  tx.skill.findMany.mockResolvedValue([]);
  tx.mcqItem.upsert.mockImplementation(write("mcqItem.upsert"));
  tx.mcqOption.deleteMany.mockImplementation(write("mcqOption.deleteMany"));
  tx.mcqOption.createMany.mockImplementation(write("mcqOption.createMany"));
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

describe("updateQuestion", () => {
  const formPayload = {
    numberLabel: "12",
    isDiscursive: false,
    status: "DRAFT",
    subjects: ["matematica"],
    skills: ["H01"],
    stimulus: { contentHtml: "Enunciado", sourceRef: "ENEM 2024" },
    mcq: {
      optionCount: 4,
      shuffleOptions: true,
      correctOptionKey: "B",
      options: ["A", "B", "C", "D"].map((label) => ({ label, textPlain: `Opção ${label}` })),
    },
  };

  it("accepts exactly what the edit form sends and rejects unknown fields", () => {
    expect(questionUpdateSchema.safeParse(formPayload).success).toBe(true);
    expect(questionUpdateSchema.safeParse({ ...formPayload, difficulty: "HARD" }).success).toBe(false);
  });

  it("replaces subjects and skills with the sent set", async () => {
    tx.subject.findMany.mockResolvedValue([{ id: 3, slug: "matematica" }]);
    tx.skill.findMany.mockResolvedValue([{ id: 9, code: "H01" }]);

    await updateQuestion(5, questionUpdateSchema.parse(formPayload));

    expect(tx.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          subjects: { deleteMany: {}, create: [{ subjectId: 3 }] },
          skills: { deleteMany: {}, create: [{ skillId: 9 }] },
        }),
      }),
    );
  });

  it("clears subjects and skills when sent empty", async () => {
    await updateQuestion(5, { subjects: [], skills: [] });

    expect(tx.question.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { subjects: { deleteMany: {}, create: [] }, skills: { deleteMany: {}, create: [] } },
      }),
    );
  });

  it("only changes the status when approving", async () => {
    await updateQuestion(5, { status: "PUBLISHED" });

    expect(tx.question.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "PUBLISHED" } }));
    expect(committed).toEqual(["question.update"]);
  });

  it("rejects an unknown subject before writing anything", async () => {
    tx.subject.findMany.mockResolvedValue([]);

    await expect(updateQuestion(5, { subjects: ["inexistente"] })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("inexistente"),
    });
    expect(tx.question.update).not.toHaveBeenCalled();
    expect(committed).toEqual([]);
  });

  it("leaves no partial state when a write fails midway", async () => {
    tx.subject.findMany.mockResolvedValue([{ id: 3, slug: "matematica" }]);
    tx.skill.findMany.mockResolvedValue([{ id: 9, code: "H01" }]);
    tx.mcqOption.createMany.mockRejectedValue(new Error("connection lost"));

    await expect(updateQuestion(5, questionUpdateSchema.parse(formPayload))).rejects.toThrow("connection lost");

    // The question row and the old options were touched only inside the rolled-back transaction.
    expect(tx.question.update).toHaveBeenCalled();
    expect(tx.mcqOption.deleteMany).toHaveBeenCalled();
    expect(committed).toEqual([]);
    expect(db.question.update).not.toHaveBeenCalled();
    expect(db.mcqOption.createMany).not.toHaveBeenCalled();
  });

  it("is a 404 when the question does not exist", async () => {
    tx.question.findUnique.mockResolvedValue(null);

    await expect(updateQuestion(404, { status: "PUBLISHED" })).rejects.toMatchObject({ status: 404 });
    expect(committed).toEqual([]);
  });
});
