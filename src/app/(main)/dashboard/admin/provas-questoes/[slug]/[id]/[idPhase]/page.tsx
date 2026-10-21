import { notFound } from "next/navigation";
import { BoardViewClient } from "./_components/board-view-client";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { getExamPhase } from "@/server/exams";
import { listQuestions } from "@/server/questions";
import { parseId } from "@/lib/utils";

interface PageProps {
  params: { slug: string; id: string, idPhase: string };
}

export default async function Provas({ params }: PageProps) {
  await requirePageAuth({
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

  const questions = await listQuestions({ examPhaseId: phase.id });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <BoardViewClient board={phase} />
      <SectionCards phasesNumber={questions.items.length} />
      <h1 className="font-bold text-2xl">Questões</h1>
      <p>
        Aqui você criará as questões para a fase selecionada.</p>
      <DataTable data={questions.items} slug={slug} id={id} idPhase={idPhase} />
    </div>
  );
}
