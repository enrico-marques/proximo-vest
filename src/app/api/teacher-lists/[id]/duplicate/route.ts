// app/api/teacher-lists/[id]/duplicate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";
import { consumeUsage } from "@/server/limits";
import { partitionPublishedQuestionIds } from "@/server/teacher-lists";

type Params = { id: string };

export const POST = defineRoute<Params>({ perm: "teacherList.manage" }, async (_req, { params, user }) => {
  const { id } = params;

  const list = await prisma.teacherList.findFirst({
    where: {
      id: id,
      teacherId: user.id,
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "Lista não encontrada" }, { status: 404 });
  }

  const { duplicated, omittedQuestions } = await prisma.$transaction(async (tx) => {
    // Questions unpublished since the list was built are not carried over to the copy.
    const { published, unavailable } = await partitionPublishedQuestionIds(
      list.questions.map((item) => item.questionId),
      tx,
    );
    await consumeUsage(user.id, "TEACHER_LIST", tx);

    const newList = await tx.teacherList.create({
      data: {
        name: `${list.name} (cópia)`,
        description: list.description,
        teacherId: list.teacherId,
        teacherName: list.teacherName,
      },
    });

    if (published.length > 0) {
      await tx.teacherListQuestion.createMany({
        data: published.map((questionId, index) => ({
          listId: newList.id,
          questionId,
          order: index + 1,
        })),
      });
    }

    return { duplicated: newList, omittedQuestions: unavailable.length };
  });

  return NextResponse.json({ ...duplicated, omittedQuestions }, { status: 201 });
});
