import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/server/auth/define-route";

type Db = Prisma.TransactionClient | typeof prisma;

// A question can be unpublished after it was added to a list; it must stop reaching teachers.
const PUBLISHED_ITEMS = { question: { status: "PUBLISHED" } } satisfies Prisma.TeacherListQuestionWhereInput;

/**
 * Splits the ids (deduplicated, first position kept) into published questions and the rest.
 * The single rule for what a teacher list may hold.
 */
export async function partitionPublishedQuestionIds(questionIds: number[], db: Db = prisma) {
  const ids = [...new Set(questionIds)];
  if (ids.length === 0) return { published: [], unavailable: [] };

  const found = await db.question.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: { id: true },
  });
  const publishedSet = new Set(found.map((q) => q.id));

  return {
    published: ids.filter((id) => publishedSet.has(id)),
    unavailable: ids.filter((id) => !publishedSet.has(id)),
  };
}

/**
 * Fails unless every id is a published question, so a teacher cannot pull drafts or
 * archived questions by id.
 */
export async function resolvePublishedQuestionIds(questionIds: number[], db: Db = prisma) {
  const { published: ids, unavailable } = await partitionPublishedQuestionIds(questionIds, db);

  if (unavailable.length > 0) {
    throw new HttpError(400, `Questões inexistentes ou não publicadas: ${unavailable.join(", ")}`);
  }
  return ids;
}

export function getTeacherList(id: string, teacherId: string) {
  return prisma.teacherList.findFirst({
    where: { id, teacherId },
    include: {
      questions: {
        where: PUBLISHED_ITEMS,
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              mcq: { include: { options: true } },
              fr: true,
              subjects: { include: { subject: true } },
            },
          },
        },
      },
    },
  });
}

export function getTeacherListForPdf(id: string, teacherId: string) {
  return prisma.teacherList.findFirst({
    where: { id, teacherId },
    include: {
      questions: {
        where: PUBLISHED_ITEMS,
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              stimulus: true,
              mcq: { include: { options: true } },
              fr: true,
            },
          },
        },
      },
    },
  });
}
