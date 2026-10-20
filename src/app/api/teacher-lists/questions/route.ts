// app/api/teacher-lists/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Difficulty, type Prisma } from "@/generated/prisma/client";
import { defineRoute } from "@/server/auth/define-route";

// opcional: força runtime node
export const runtime = "nodejs";

export const GET = defineRoute({ perm: "teacherList.manage" }, async (req) => {
  const url = new URL(req.url);

  const subjectIdStr = url.searchParams.get("subjectId");
  const difficulty = url.searchParams.get("difficulty");
  const boardIdStr = url.searchParams.get("boardId"); // ExamBoard.id
  const yearStr = url.searchParams.get("year");       // ExamEdition.year
  const q = url.searchParams.get("q");

  const andFilters: Prisma.QuestionWhereInput[] = [];

  // status sempre PUBLISHED
  andFilters.push({
    status: "PUBLISHED",
  });

  // disciplina
  if (subjectIdStr && subjectIdStr !== "all") {
    const subjectId = Number(subjectIdStr);
    if (!Number.isNaN(subjectId)) {
      andFilters.push({
        subjects: {
          some: { subjectId },
        },
      });
    }
  }

  // dificuldade
  if (difficulty && difficulty !== "all") {
    andFilters.push({
      difficulty: z.enum(Difficulty).parse(difficulty),
    });
  }

  // ExamBoard (instituição)
  if (boardIdStr && boardIdStr !== "all") {
    const boardId = Number(boardIdStr);
    if (!Number.isNaN(boardId)) {
      andFilters.push({
        phase: {
          edition: {
            examBoardId: boardId,
          },
        },
      });
    }
  }

  // Ano (ExamEdition.year)
  if (yearStr && yearStr !== "all") {
    const year = Number(yearStr);
    if (!Number.isNaN(year)) {
      andFilters.push({
        phase: {
          edition: {
            year,
          },
        },
      });
    }
  }

  // Busca por texto (enunciado / stimulus)
  if (q && q.trim()) {
    const search = q.trim();
    andFilters.push({
      OR: [
        {
          stimulus: {
            contentText: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          stimulus: {
            contentHtml: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  const where: Prisma.QuestionWhereInput = {
    AND: andFilters,
  };

  const questions = await prisma.question.findMany({
    where,
    take: 50,
    orderBy: [{ examPhaseId: "asc" }, { numberLabel: "asc" }],
    include: {
      subjects: {
        include: { subject: true },
      },
      stimulus: true,
      mcq: {
        include: { options: true },
      },
      fr: true,
      phase: {
        include: {
          edition: {
            include: {
              board: true,
            },
          },
        },
      },
    },
  });

  const dto = questions.map((q) => {
    // corpo base em markdown/texto (você ajusta depois se tiver outro campo)
    const body =
      q.stimulus?.contentHtml ??
      q.stimulus?.contentText ??
      q.mcq?.options?.[0]?.textHtml ??
      q.mcq?.options?.[0]?.textPlain ??
      "";

    let preview =
      q.stimulus?.contentText ??
      q.stimulus?.contentHtml?.replace(/<[^>]+>/g, " ") ??
      "";

    preview = preview.replace(/\s+/g, " ").trim();

    if (!preview && q.mcq?.options?.length) {
      preview = q.mcq.options[0].textPlain ?? "";
    }

    if (!preview) {
      preview = `Questão ${q.numberLabel}`;
    }

    if (preview.length > 220) {
      preview = preview.slice(0, 220) + "…";
    }

    return {
      id: q.id,
      numberLabel: q.numberLabel,
      difficulty: q.difficulty,
      isDiscursive: q.isDiscursive,
      subjects: q.subjects.map((s) => ({
        id: s.subjectId,
        name: s.subject.name,
      })),
      preview,
      body,
      options: q.mcq?.options?.map((opt) => ({
        label: opt.label,
        text: opt.textHtml || opt.textPlain || "",
      })),
      examBoardId: q.phase.edition.examBoardId,
      examBoardName: q.phase.edition.board.name,
      examYear: q.phase.edition.year,
    };
  });

  return NextResponse.json(dto);
});
