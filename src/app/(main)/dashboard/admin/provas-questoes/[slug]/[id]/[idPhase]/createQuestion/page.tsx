import { notFound } from "next/navigation";
import { CreateQuestionForm } from "./_components/formCreateEdition";
import { requirePageAuth } from "@/utils/access";
import { getExamPhase } from "@/server/exams";
import { parseId } from "@/lib/utils";

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

  const { idPhase } = await params;
  const phaseId = parseId(idPhase);
  if (phaseId === null) notFound();

  const phase = await getExamPhase(phaseId);
  if (!phase) notFound();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <h1 className="font-bold text-2xl">
        Criar questão da fase {phase.phaseNumber}
      </h1>

      <p>
        Aqui você criará as fases (1° e 2° fase) ou os dias (D1 e D2) de uma
        edição de prova de um determinado ano
      </p>

      <CreateQuestionForm isDiscursive={phase.isDiscursive} examPhaseId={phase.id} defaultOptionCount={phase.defaultOptionCount ?? 5} />
    </div>
  );
}
