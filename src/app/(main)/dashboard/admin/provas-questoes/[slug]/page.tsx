import { notFound } from "next/navigation";
import { BoardViewClient } from "./_components/board-view-client";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { getExamBoardBySlug, listExamEditions } from "@/server/exams";

interface PageProps {
  params: { slug: string };
}

export default async function Provas({ params }: PageProps) {
  await requirePageAuth({
    perm: ["examBoard.manage"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const { slug } = await params;

  const board = await getExamBoardBySlug(slug);
  if (!board) notFound();

  const editions = await listExamEditions({ examBoardId: board.id });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <BoardViewClient board={board} />
      <SectionCards editionNumber={editions.length} />
      <h1 className="font-bold text-2xl">Edições</h1>
      <p>
        Aqui você criará as edições de uma prova Exemplo:{" "}
        <code>2025, 2024, 2023</code>
      </p>
      <DataTable data={editions} slug={slug} />
    </div>
  );
}
