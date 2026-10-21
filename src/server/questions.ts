import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const QUESTION_LIST_INCLUDES = [
  "stimulus",
  "subjects",
  "skills",
  "mcq",
  "fr",
  "expectedAnswers",
  "rubrics",
  "options",
] as const;

export type QuestionListInclude = (typeof QUESTION_LIST_INCLUDES)[number];

export type QuestionListQuery = {
  examPhaseId?: number;
  subject?: string;
  isDiscursive?: boolean;
  include?: QuestionListInclude[];
  orderBy?: "id" | "numberLabel" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function listQuestions({
  examPhaseId,
  subject,
  isDiscursive,
  include = [],
  orderBy = "numberLabel",
  order = "asc",
  page = 1,
  pageSize = 50,
}: QuestionListQuery = {}) {
  const where: Prisma.QuestionWhereInput = {};
  if (examPhaseId) where.examPhaseId = examPhaseId;
  if (typeof isDiscursive === "boolean") where.isDiscursive = isDiscursive;
  if (subject) where.subjects = { some: { subject: { slug: subject } } };

  const has = (key: QuestionListInclude) => include.includes(key);
  const selectInclude = {
    stimulus: has("stimulus") ? { include: { assets: true } } : false,
    subjects: has("subjects") ? { include: { subject: true } } : false,
    skills: has("skills") ? { include: { skill: true } } : false,
    mcq: has("mcq") || has("options") ? { include: { options: true } } : false,
    fr:
      has("fr") || has("expectedAnswers") || has("rubrics")
        ? { include: { expectedAnswers: has("expectedAnswers"), rubrics: has("rubrics") } }
        : false,
  };

  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { [orderBy]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: selectInclude,
    }),
    prisma.question.count({ where }),
  ]);

  return { total, page, pageSize, items };
}

const questionDetailInclude = {
  stimulus: { include: { assets: true } },
  subjects: { include: { subject: true } },
  skills: { include: { skill: true } },
  mcq: { include: { options: true } },
  fr: { include: { expectedAnswers: true, rubrics: true } },
} satisfies Prisma.QuestionInclude;

type QuestionDetailRow = Prisma.QuestionGetPayload<{ include: typeof questionDetailInclude }>;

// Decimal instances cannot cross into Client Components, so scores leave the server as numbers.
function toPlainQuestion(question: QuestionDetailRow) {
  const { fr } = question;
  return {
    ...question,
    fr: fr && {
      ...fr,
      maxScore: fr.maxScore?.toNumber() ?? null,
      expectedAnswers: fr.expectedAnswers.map((a) => ({ ...a, maxScore: a.maxScore?.toNumber() ?? null })),
    },
  };
}

export type QuestionDetail = ReturnType<typeof toPlainQuestion>;

export async function getQuestionDetail(id: number) {
  const question = await prisma.question.findUnique({ where: { id }, include: questionDetailInclude });
  return question && toPlainQuestion(question);
}
