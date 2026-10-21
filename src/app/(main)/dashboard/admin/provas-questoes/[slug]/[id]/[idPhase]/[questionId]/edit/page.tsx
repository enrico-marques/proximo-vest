// app/dashboard/provas-questoes/[slug]/[id]/[idPhase]/[questionId]/edit/page.tsx
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EditQuestionForm } from "./_components/EditQuestionForm";
import { requirePageAuth } from "@/utils/access";
import { getQuestionDetail, type QuestionDetail } from "@/server/questions";
import { parseId } from "@/lib/utils";

async function getQuestion(questionId: string): Promise<QuestionDetail> {
  const id = parseId(questionId);
  const question = id === null ? null : await getQuestionDetail(id);
  if (!question) notFound();
  return question;
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
