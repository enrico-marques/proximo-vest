import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export function listExamBoards({ filter }: { filter?: string } = {}) {
  return prisma.examBoard.findMany({
    where: filter
      ? {
          OR: [
            { name: { contains: filter, mode: "insensitive" } },
            { slug: { contains: filter, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
  });
}

export function getExamBoardBySlug(slug: string) {
  return prisma.examBoard.findUnique({ where: { slug } });
}

export function listExamEditions({ examBoardId, year }: { examBoardId?: number; year?: number } = {}) {
  const where: Prisma.ExamEditionWhereInput = {};
  if (examBoardId !== undefined) where.examBoardId = examBoardId;
  if (year !== undefined) where.year = year;

  return prisma.examEdition.findMany({
    where,
    orderBy: [{ year: "desc" }, { editionLabel: "asc" }],
  });
}

export function getExamEdition(id: number) {
  return prisma.examEdition.findUnique({ where: { id } });
}

export function listExamPhases(
  filters: { examEditionId?: number; phaseNumber?: number; dayNumber?: number } = {},
) {
  const where: Prisma.ExamPhaseWhereInput = {};
  if (filters.examEditionId !== undefined) where.examEditionId = filters.examEditionId;
  if (filters.phaseNumber !== undefined) where.phaseNumber = filters.phaseNumber;
  if (filters.dayNumber !== undefined) where.dayNumber = filters.dayNumber;

  return prisma.examPhase.findMany({
    where,
    orderBy: [{ phaseNumber: "asc" }, { dayNumber: "asc" }],
  });
}

export function getExamPhase(id: number) {
  return prisma.examPhase.findUnique({ where: { id } });
}
