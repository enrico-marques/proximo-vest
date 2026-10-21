import { notFound } from "next/navigation";
import { FormCreateEdition } from "./_components/formCreateEdition";
import { requirePageAuth } from "@/utils/access";
import { EXAM_BOARD_READ, getExamBoardBySlug } from "@/server/exams";

interface PageProps {
  params: { slug: string };
}

export default async function Provas({ params }: PageProps) {
  await requirePageAuth({
    // The page's own permission plus the read permission of every service it calls.
    allOf: [EXAM_BOARD_READ],
    perm: ["examEdition.manage"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const { slug } = await params;

  const board = await getExamBoardBySlug(slug);
  if (!board) notFound();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <h1 className="font-bold text-2xl">
        Criar edição da prova da {board.name}
      </h1>

      <p>
        Aqui você criará as edições de uma prova Exemplo:{" "}
        <code>2025,2024,2023</code>
      </p>

      <FormCreateEdition boardId={board.id} slug={slug} />
    </div>
  );
}
