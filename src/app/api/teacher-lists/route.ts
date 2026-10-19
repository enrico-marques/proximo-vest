// app/api/teacher-lists/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";

const createTeacherListSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  description: z.string().optional(),
  teacherName: z.string().min(2, "Nome do professor muito curto"),
  // IDs de Question (Int no Prisma)
  questionIds: z.array(z.number().int()).min(1, "Selecione pelo menos 1 questão"),
});

export const GET = defineRoute({ perm: "teacherList.manage" }, async (_req, { user }) => {
  const lists = await prisma.teacherList.findMany({
    where: { teacherId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });

  return NextResponse.json(
    lists.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      teacherName: l.teacherName,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      questionsCount: l._count.questions,
    }))
  );
});

export const POST = defineRoute({ perm: "teacherList.manage" }, async (req, { user }) => {
  const json = await req.json();
  const parsed = createTeacherListSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, teacherName, questionIds } = parsed.data;

  const created = await prisma.$transaction(async (tx) => {
    const list = await tx.teacherList.create({
      data: {
        name,
        description,
        teacherId: user.id,
        teacherName,
      },
    });

    await tx.teacherListQuestion.createMany({
      data: questionIds.map((questionId, index) => ({
        listId: list.id,
        questionId,
        order: index + 1,
      })),
    });

    return list;
  });

  return NextResponse.json(created, { status: 201 });
});
