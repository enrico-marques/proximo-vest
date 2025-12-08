// app/dashboard/provas-questoes/[slug]/[id]/[idPhase]/[questionId]/edit/page.tsx
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EditQuestionForm } from "./_components/EditQuestionForm";
import { requirePageAuth } from "@/utils/access";
import { headers } from "next/headers";

// Mesmo shape que você usou na página de preview
type McqOption = {
  label: "A" | "B" | "C" | "D" | "E";
  textPlain: string;
};

type McqBlock = {
  optionCount: number;
  shuffleOptions: boolean;
  correctOptionKey: "A" | "B" | "C" | "D" | "E";
  options: McqOption[];
};

type FrExpectedAnswer = {
  label: string;
  answerHtml: string;
  maxScore: number;
};

type FrBlock = {
  maxScore: number;
  answerGuidanceHtml?: string | null;
  expectedAnswers: FrExpectedAnswer[];
};

type StimulusBlock = {
  contentHtml: string;
  contentText?: string | null;
  sourceRef?: string | null;
};

type SubjectDTO = {
  questionId: number;
  subjectId: number;
  subject: {
    id: number | string;
    name: string;
    slug: string;
  };
};

type SkillDTO = {
  questionId: number;
  skillId: number;
  skill: {
    id: number | string;
    code: string | null;
    label: string;
  };
};
type QuestionApiResponse = {
  id: number;
  examPhaseId: number;
  stimulusId: number;
  numberLabel: string;
  isDiscursive: boolean;
  difficulty: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  sourcePageStart: number | null;
  sourcePageEnd: number | null;
  createdAt: string;
  updatedAt: string;

  stimulus: StimulusBlock;

  mcq?: McqBlock | null;
  fr?: FrBlock | null;

  subjects?: SubjectDTO[];
  skills?: SkillDTO[];
};

// Shape que o EditQuestionForm espera (é compatível com o de cima)
type QuestionForEdit = QuestionApiResponse;

// Busca a questão na sua API (mesmo endpoint da preview)
async function getQuestion(questionId: string): Promise<QuestionForEdit> {
  const res = await fetch(`${process.env.API_URL}/question/${questionId}`, {
    cache: "no-store",
    headers: {
      // encaminha os cookies da requisição atual pra sua API interna
      cookie: (await headers()).get("cookie") ?? "",
    },
  });

  if (!res.ok) {
    notFound();
  }

  const data = (await res.json()) as QuestionApiResponse;
  return data;
}

type PageProps = {
  params: {
    slug: string;
    id: string;
    idPhase: string;
    questionId: string;
  };
};

export default async function EditQuestionPage({ params }: PageProps) {
  await requirePageAuth({
    perm: ["question.update"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });
  const { slug, id, idPhase, questionId } = await params;

  const question = await getQuestion(questionId);

  const defaultOptionCount =
    !question.isDiscursive && question.mcq?.optionCount
      ? question.mcq.optionCount
      : 5;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-8 px-4 sm:px-0">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary/80">
            Edição de questão
          </p>
          <h1 className="text-xl font-semibold">
            Editar questão {question.numberLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            Altere o enunciado, alternativas, subjects e skills. As mudanças
            serão salvas para esta fase de prova.
          </p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <a href={`/dashboard/admin/provas-questoes/${slug}/${id}/${idPhase}`}>
            Voltar para a lista
          </a>
        </Button>
      </div>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Dados da questão
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <EditQuestionForm
            question={question}
            defaultOptionCount={defaultOptionCount}
            slug={slug}
            id={id}
            idPhase={idPhase}
          />
        </CardContent>
      </Card>
    </div>
  );
}
