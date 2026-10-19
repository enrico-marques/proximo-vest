// app/api/teacher-lists/filters/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";

export const GET = defineRoute({ perm: "teacherList.manage" }, async (req) => {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const difficulties = [
    { value: "VERY_EASY", label: "Muito fácil" },
    { value: "EASY", label: "Fácil" },
    { value: "MEDIUM", label: "Médio" },
    { value: "HARD", label: "Difícil" },
    { value: "VERY_HARD", label: "Muito difícil" },
  ];

  // Boards (instituições)
  const boards = await prisma.examBoard.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  // Anos por board (ExamEdition.year + examBoardId)
  const editions = await prisma.examEdition.findMany({
    distinct: ["examBoardId", "year"],
    orderBy: [{ examBoardId: "asc" }, { year: "desc" }],
    select: {
      examBoardId: true,
      year: true,
    },
  });

  const years = editions.map((e) => ({
    boardId: e.examBoardId,
    year: e.year,
  }));

  return NextResponse.json({
    subjects,
    difficulties,
    boards,
    years,
  });
});
