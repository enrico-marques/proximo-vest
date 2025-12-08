import { notFound } from "next/navigation";
import MarkdownIt from "markdown-it";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ApproveQuestionButton } from "./_components/ApproveQuestionButton";
import { QuestionStatusBadge } from "./_components/status-badge";
import { requirePageAuth } from "@/utils/access";
import { headers } from "next/headers";


const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
});

// Tipos esperados da API de questão (ajusta conforme seu backend)
type SubjectDTO = {
  id: number | string | null;
  name: string;
  slug: string;
};

type SkillDTO = {
  id: number | string | null;
  code: string | null;
  label: string;
};

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

type QuestionResponse = {
  id: number;
  examPhaseId: number;
  stimulusId: number;
  numberLabel: string;
  isDiscursive: boolean;
  difficulty: string | null;
  status: string;
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

// Busca a questão na API (ajusta o endpoint se precisar)
async function getQuestion(questionId: string): Promise<QuestionResponse> {
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

  const data = (await res.json()) as QuestionResponse;
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

export default async function QuestionPreviewPage({ params }: PageProps) {
  await requirePageAuth({
    perm: ["question.read"],
    emailVerified: true,
    blockSuspended: true,
    blockDeleted: true,
    onForbiddenRedirect: "/dashboard", // opcional
  });
  const { questionId, slug, id, idPhase } = await params;
  const question = await getQuestion(questionId);

  const isDiscursive = question.isDiscursive;

  const stimulusHtml = md.render(question.stimulus.contentHtml || "");

  const mcq = question.mcq;
  const fr = question.fr;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-8 px-4 sm:px-0">
      {/* Cabeçalho / contexto */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary/80">
            Pré-visualização • Modo aluno
          </p>
          <h1 className="text-xl font-semibold">
            Questão {question.numberLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            Você está visualizando esta questão exatamente como o aluno verá na
            plataforma (sem gabarito).
          </p>
        </div>
        

         <div className="flex items-center gap-2">
          {/* Botão de aprovar só aparece se veio como DRAFT */}
          <ApproveQuestionButton
            questionId={question.id}
            initialStatus={question.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"}
          />

          <Button variant="outline" size="sm" asChild>
            <a href={`/dashboard/provas-questoes/${slug}/${id}/${idPhase}`}>
              Voltar para a lista
            </a>
          </Button>
        </div>
      </div>

      {/* Metadados da questão */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">
          {isDiscursive ? "Discursiva" : "Objetiva"}
        </Badge>

    <QuestionStatusBadge initialStatus={question.status as any} />


        {question.difficulty && (
          <Badge variant="outline">Dificuldade: {question.difficulty}</Badge>
        )}

        {question.subjects &&
          question.subjects.map((subj, idx) => (
            <Badge
              key={`${subj.id ?? subj.slug}-${idx}`}
              variant="outline"
            >
              {subj.name}
            </Badge>
          ))}

        {question.skills &&
          question.skills.map((skill, idx) => (
            <Badge
              key={`${skill.id ?? skill.code ?? skill.label}-${idx}`}
              variant="outline"
            >
              {skill.label}
              {skill.code && (
                <span className="ml-1 opacity-70">({skill.code})</span>
              )}
            </Badge>
          ))}
      </div>

      {/* Cartão principal da questão */}
      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {question.numberLabel}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  Questão {isDiscursive ? "discursiva" : "objetiva"}
                </span>
                {question.stimulus.sourceRef && (
                  <span className="text-[11px] text-muted-foreground">
                    Fonte: {question.stimulus.sourceRef}
                  </span>
                )}
              </div>
            </div>
          </CardTitle>

          {question.sourcePageStart && (
            <CardDescription className="text-[11px]">
              Caderno: páginas {question.sourcePageStart}
              {question.sourcePageEnd &&
                question.sourcePageEnd !== question.sourcePageStart &&
                `–${question.sourcePageEnd}`}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-2 pt-6">
          {/* Estímulo / Enunciado */}
          <section className="space-y-2">

            <div
              className="
                rounded-xl border bg-card/80 px-5 py-4 shadow-sm
                prose prose-base max-w-none
                prose-headings:mb-2 prose-headings:mt-4 prose-headings:text-foreground
                prose-p:text-[15px] prose-p:leading-relaxed
                prose-strong:font-semibold
                prose-ul:list-disc prose-ul:pl-5 prose-li:my-1
                prose-ol:list-decimal prose-ol:pl-5
                prose-blockquote:border-l-4 prose-blockquote:border-primary/60 prose-blockquote:pl-4
                prose-img:my-4 prose-img:rounded-md prose-img:shadow-md
                dark:prose-invert
              "
              dangerouslySetInnerHTML={{ __html: stimulusHtml }}
            />
          </section>

          {/* Objetiva (MCQ) */}
          {!isDiscursive && mcq && (
  <section className="space-y-2">
    <div className="space-y-2">
      {mcq.options.map((opt, idx) => {
        const html = md.render(opt.textPlain || "");

        return (
          <button
            key={`${question.id}-${opt.label}-${idx}`}
            type="button"
            disabled
            className="flex w-full items-start gap-3 rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-muted/60 disabled:cursor-default"
          >
            {/* bolinha da alternativa */}
            <span className="flex h-6 w-6 items-center justify-center rounded-full border bg-muted/80 text-xs font-semibold">
              {opt.label}
            </span>

            {/* texto da alternativa em markdown, SEM margem no <p> */}
            <div
              className="
                prose prose-sm max-w-none dark:prose-invert
                prose-p:my-0 prose-p:leading-snug
                prose-ul:my-1 prose-ol:my-1
              "
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </button>
        );
      })}
    </div>

    <p className="mt-1 text-xs text-muted-foreground">
      O aluno verá as alternativas nesse formato, podendo selecionar
      apenas uma. Nesta pré-visualização os controles estão desativados.
    </p>
  </section>
)}

          {/* Discursiva (FR) */}
          {isDiscursive && fr && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground tracking-tight">
                Resposta do aluno
              </h2>

              <div className="space-y-2">
                <textarea
                  className="min-h-40 w-full resize-y rounded-md border bg-muted px-3 py-2 text-sm outline-none"
                  placeholder="Aqui o aluno digitará a resposta..."
                  disabled
                />
                <p className="text-[11px] text-muted-foreground">
                  Nota máxima: <strong>{fr.maxScore}</strong>
                </p>
              </div>

              {fr.answerGuidanceHtml && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Orientação ao corretor (não exibida ao aluno):
                  </p>
                  <div
                    className="prose prose-xs max-w-none rounded-md bg-muted/50 p-2 dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: md.render(fr.answerGuidanceHtml),
                    }}
                  />
                </div>
              )}

              {fr.expectedAnswers && fr.expectedAnswers.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Resposta modelo / gabarito comentado (não exibido ao aluno):
                  </p>
                  <div
                    className="prose prose-xs max-w-none rounded-md bg-muted/40 p-2 dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: md.render(fr.expectedAnswers[0].answerHtml),
                    }}
                  />
                </div>
              )}
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
