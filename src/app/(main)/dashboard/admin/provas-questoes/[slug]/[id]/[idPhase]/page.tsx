import { BoardViewClient } from "./_components/board-view-client";
import { DataTable } from "./_components/data-table";
import { SectionCards } from "./_components/section-cards";
import { requirePageAuth } from "@/utils/access";
import { headers } from "next/headers";
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

  const res = await fetch(`${process.env.API_URL}/exam-phase/${idPhase}`, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headers()).get("cookie") ?? "",
    },
  });

  const phase = await res.json();

  const resQuestions = await fetch(
    `${process.env.API_URL}/question/list?examPhaseId=${phase.id}`,
    {
      cache: "no-store",
    }
  );
  const questions = await resQuestions.json();
  const questionsNumber = questions.items.length as number;
  console.log(questions)
  console.log(questionsNumber)

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <BoardViewClient board={phase} />
      <SectionCards phasesNumber={questionsNumber} />
      <h1 className="font-bold text-2xl">Questões</h1>
      <p>
        Aqui você criará as questões para a fase selecionada.</p>
      <DataTable data={questions.items} slug={slug} id={id} idPhase={idPhase} />
    </div>
  );
}
