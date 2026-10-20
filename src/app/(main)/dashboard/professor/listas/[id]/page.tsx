// src/app/(main)/dashboard/professor/listas/[id]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requirePageAuth } from "@/utils/access";
import { TeacherListForm} from "../_components/teacher-list-form";
import {

  TeacherListInitialData,
} from "../_components/types";

type PageProps = {
  params: { id: string };
};

export const metadata: Metadata = {
  title: "Editar lista de professor | Próximo Vest",
};

export default async function EditTeacherListPage({ params }: PageProps) {
  const { session } = await requirePageAuth({ perm: "teacherList.manage", emailVerified: true });

  const list = await prisma.teacherList.findFirst({
    where: {
      id: params.id,
      teacherId: session.user.id,
    },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              subjects: {
                include: { subject: true },
              },
              stimulus: true,
              mcq: {
                include: { options: true },
              },
              fr: true,
            },
          },
        },
      },
    },
  });

  if (!list) {
    notFound();
  }

  const initial: TeacherListInitialData = {
    id: list.id,
    name: list.name,
    description: list.description,
    teacherName: list.teacherName,
    questions: list.questions.map((item) => {
      const q = item.question;
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
        body: q.stimulus?.contentText ?? q.stimulus?.contentHtml ?? "", // Add body property
        options: q.mcq?.options?.map(opt => ({
          label: opt.label,
          text: opt.textPlain ?? opt.textHtml ?? "",
        })),
      };
    }),
  };

  return (
    <div className="flex flex-col gap-6">
      <TeacherListForm initialData={initial} />
    </div>
  );
}
