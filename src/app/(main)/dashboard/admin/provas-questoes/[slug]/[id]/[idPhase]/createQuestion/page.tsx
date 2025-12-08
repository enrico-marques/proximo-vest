import { CreateQuestionForm } from "./_components/formCreateEdition";
import { requirePageAuth } from "@/utils/access";
import { headers } from "next/headers";

interface PageProps {
  params: { slug: string; id: string, idPhase: string };
}

export default async function Provas({ params }: PageProps) {
  await requirePageAuth({
    perm: ["question.create"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });

  const { slug, id, idPhase } = await params;
  const res = await fetch(`${process.env.API_URL}/exam-phase/${idPhase} `, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headers()).get("cookie") ?? "",
    },
  });

  const phase = await res.json();

  console.log(phase)

  const phaseId = phase.id as number;
  if (phaseId === undefined) {
    return null;
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <h1 className="font-bold text-2xl">
        Criar edição da prova da {phase.name}
      </h1>

      <p>
        Aqui você criará as fases (1° e 2° fase) ou os dias (D1 e D2) de uma
        edição de prova de um determinado ano
      </p>

      <CreateQuestionForm isDiscursive={phase.isDiscursive} examPhaseId={phase.id} defaultOptionCount={phase.defaultOptionCount}   />
    </div>
  );
}
