import { BoardViewClient } from "./_components/board-view-client";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { headers } from "next/headers";
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

  const res = await fetch(`${process.env.API_URL}/exam-edition/${id}`, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headers()).get("cookie") ?? "",
    },
  });

  const edition = await res.json();


  const resPhase = await fetch(
    `${process.env.API_URL}/exam-phase/list?examEditionId=${edition.id}`,
    {
      cache: "no-store",
    }
  );
  const phases = await resPhase.json();
  const phasesNumber = phases.length as number;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <BoardViewClient board={edition} />
      <SectionCards phasesNumber={phasesNumber} />
      <h1 className="font-bold text-2xl">Fases</h1>
      <p>
        Aqui você criará as fases (1° e 2° fase) ou os dias (D1 e D2) de uma edição de prova de um determinado ano</p>
      <DataTable data={phases} slug={slug} id={id} />
    </div>
  );
}
