import { notFound, redirect } from "next/navigation";
import { BoardViewClient } from "./_components/board-view-client";
import { DataTable } from "./_components/data-table";
import { QuestionPagination } from "./_components/question-pagination";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { EXAM_PHASE_READ, getExamPhase } from "@/server/exams";
import { QUESTION_READ, listQuestions, questionPageSchema } from "@/server/questions";
import { parseId } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string; id: string; idPhase: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Provas({ params, searchParams }: PageProps) {
  await requirePageAuth({
    // The page's own permission plus the read permission of every service it calls.
    allOf: [EXAM_PHASE_READ, QUESTION_READ],
    perm: ["examPhase.manage"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const { slug, id, idPhase } = await params;
  const phaseId = parseId(idPhase);
  if (phaseId === null) notFound();

  const phase = await getExamPhase(phaseId);
  if (!phase) notFound();

  const { page, pageSize } = questionPageSchema.parse(await searchParams);
  const questions = await listQuestions({ examPhaseId: phase.id, page, pageSize });

  const basePath = `/dashboard/admin/provas-questoes/${slug}/${id}/${idPhase}`;
  if (page > questions.pageCount) {
    redirect(`${basePath}?page=${questions.pageCount}&pageSize=${pageSize}`);
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <BoardViewClient board={phase} />
      <SectionCards phasesNumber={questions.total} />
      <h1 className="font-bold text-2xl">Questões</h1>
      <p>
        Aqui você criará as questões para a fase selecionada.</p>
      <DataTable data={questions.items} slug={slug} id={id} idPhase={idPhase} />
      <QuestionPagination
        basePath={basePath}
        page={page}
        pageCount={questions.pageCount}
        pageSize={pageSize}
        total={questions.total}
      />
    </div>
  );
}
