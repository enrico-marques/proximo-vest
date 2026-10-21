import { notFound } from "next/navigation";
import { BoardViewClient } from "./_components/board-view-client";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { getExamEdition, listExamPhases } from "@/server/exams";
import { parseId } from "@/lib/utils";

interface PageProps {
  params: { slug: string; id: string };
}

export default async function Provas({ params }: PageProps) {
  await requirePageAuth({
    perm: ["examEdition.manage"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const { slug, id } = await params;
  const editionId = parseId(id);
  if (editionId === null) notFound();

  const edition = await getExamEdition(editionId);
  if (!edition) notFound();

  const phases = await listExamPhases({ examEditionId: edition.id });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <BoardViewClient board={edition} />
      <SectionCards phasesNumber={phases.length} />
      <h1 className="font-bold text-2xl">Fases</h1>
      <p>
        Aqui você criará as fases (1° e 2° fase) ou os dias (D1 e D2) de uma edição de prova de um determinado ano</p>
      <DataTable data={phases} slug={slug} id={id} />
    </div>
  );
}
