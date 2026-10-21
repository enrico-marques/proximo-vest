import { notFound } from "next/navigation";
import { FormCreateEdition } from "./_components/formCreateEdition";
import { requirePageAuth } from "@/utils/access";
import { EXAM_BOARD_READ, getExamBoardBySlug } from "@/server/exams";
import { parseId } from "@/lib/utils";

interface PageProps {
  params: { slug: string; id: string };
}

export default async function Provas({ params }: PageProps) {
  await requirePageAuth({
    // The page's own permission plus the read permission of every service it calls.
    allOf: [EXAM_BOARD_READ],
    perm: ["examPhase.manage"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const { slug, id } = await params;
  const editionId = parseId(id);
  if (editionId === null) notFound();

  const board = await getExamBoardBySlug(slug);
  if (!board) notFound();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <h1 className="font-bold text-2xl">
        Criar edição da prova da {board.name}
      </h1>

      <p>
        Aqui você criará as fases (1° e 2° fase) ou os dias (D1 e D2) de uma
        edição de prova de um determinado ano
      </p>

      <FormCreateEdition id={editionId} slug={slug} />
    </div>
  );
}
