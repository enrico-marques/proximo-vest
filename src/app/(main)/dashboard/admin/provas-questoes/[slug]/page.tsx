import { BoardViewClient } from "./_components/board-view-client";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { headers } from "next/headers";

type Board = { id: number; name: string; slug: string };

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

  const res = await fetch(`${process.env.API_URL}/exam-board/slug/${slug}`, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headers()).get("cookie") ?? "",
    },
  });

  const board = await res.json();

  const resEditions = await fetch(
    `${process.env.API_URL}/exam-edition/list?examBoardId=${board.id}`,
    {
      cache: "no-store",
    }
  );
  const editions = await resEditions.json();
  const editionNumber = editions.length as number;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <BoardViewClient board={board} />
      <SectionCards editionNumber={editionNumber} />
      <h1 className="font-bold text-2xl">Edições</h1>
      <p>
        Aqui você criará as edições de uma prova Exemplo:{" "}
        <code>2025, 2024, 2023</code>
      </p>
      <DataTable data={editions} slug={slug} />
    </div>
  );
}
