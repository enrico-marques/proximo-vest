"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { createQuestionMarkdown } from "@/lib/markdown";
import { useQuestionImageUpload } from "@/components/questions/use-question-image-upload";
import "react-markdown-editor-lite/lib/index.css";

const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { sl } from "date-fns/locale";
import { errorMessage } from "@/lib/api-error";
import { requestTaxonomies } from "@/components/questions/request-taxonomies";

const mdParser = createQuestionMarkdown();

// ---------- Tipos auxiliares ----------

// Taxonomias vindas de /api/subject/list e /api/skill/list
type SubjectOption = {
  id: number | string;
  name: string;
  slug: string;
};

type SkillOption = {
  id: number | string;
  code: string | null; // ex: "H01"
  label: string;
};

// Relações da questão (JSON do /api/question/:id)
type QuestionSubject = {
  questionId: number;
  subjectId: number;
  subject: SubjectOption;
};

type QuestionSkill = {
  questionId: number;
  skillId: number;
  skill: SkillOption;
};

type McqOption = {
  label: "A" | "B" | "C" | "D" | "E";
  textPlain: string | null;
};

type McqBlock = {
  optionCount: number;
  shuffleOptions: boolean;
  correctOptionKey: "A" | "B" | "C" | "D" | "E";
  options: McqOption[];
};

type FrExpectedAnswer = {
  label: string | null;
  answerHtml: string | null;
  maxScore: number | null;
};

type FrBlock = {
  maxScore: number | null;
  answerGuidanceHtml?: string | null;
  expectedAnswers: FrExpectedAnswer[];
};

type StimulusBlock = {
  contentHtml: string | null;
  contentText?: string | null;
  sourceRef?: string | null;
};

export type QuestionForEdit = {
  id: number;
  examPhaseId: number;
  numberLabel: string;
  isDiscursive: boolean;
  stimulus: StimulusBlock | null;
  subjects?: QuestionSubject[];
  skills?: QuestionSkill[];
  mcq?: McqBlock | null;
  fr?: FrBlock | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type EditQuestionFormProps = {
  question: QuestionForEdit;
  defaultOptionCount: number; // 4 ou 5 da seção/fase
    slug: string;
    id: string;
    idPhase: string;
};

// ---------- Schemas ----------

const baseSchema = z.object({
  examPhaseId: z.number(),
  numberLabel: z.string().min(1, "Obrigatório"),

  subjects: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),

  stimulusText: z.string().min(1, "O estímulo é obrigatório"),
  stimulusSourceRef: z.string().optional(),
});

const mcqSchema = baseSchema
  .extend({
    optionCount: z.enum(["4", "5"]),
    shuffleOptions: z.boolean().default(true),
    correctOptionKey: z.enum(["A", "B", "C", "D", "E"]),

    optionA: z.string().min(1, "Obrigatório"),
    optionB: z.string().min(1, "Obrigatório"),
    optionC: z.string().min(1, "Obrigatório"),
    optionD: z.string().min(1, "Obrigatório"),
    optionE: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.optionCount === "5" && !values.optionE?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["optionE"],
        message: "Obrigatório",
      });
    }

    const count = Number(values.optionCount);
    const allowed = ["A", "B", "C", "D"].concat(count === 5 ? ["E"] : []);
    if (!allowed.includes(values.correctOptionKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctOptionKey"],
        message: `A alternativa correta precisa estar entre as ${count} cadastradas.`,
      });
    }
  });

const frSchema = baseSchema.extend({
  frMaxScore: z.coerce.number().min(0, "Informe a nota máxima"),
  frAnswerGuidanceHtml: z.string().optional(),
  frExpectedAnswerHtml: z
    .string()
    .min(1, "Informe pelo menos uma resposta modelo"),
});

// One shape for both question types; the active schema validates only its own fields.
type QuestionFormValues = z.infer<typeof baseSchema> &
  Partial<z.infer<typeof mcqSchema>> &
  Partial<z.infer<typeof frSchema>>;

type TaxonomyCheckResult = {
  missingSubjects: string[];
  missingSkills: string[];
};

export function EditQuestionForm({
  question,
  defaultOptionCount,
    slug,
    id,
    idPhase,
}: EditQuestionFormProps) {
  const isDiscursive = question.isDiscursive;
    const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // taxonomias para os chips
  const [subjectsOptions, setSubjectsOptions] = useState<SubjectOption[]>([]);
  const [skillsOptions, setSkillsOptions] = useState<SkillOption[]>([]);
  const [isLoadingTaxonomies, setIsLoadingTaxonomies] = useState(true);

  const [skillInput, setSkillInput] = useState("");
  const [subjectInput, setSubjectInput] = useState("");

  const [taxonomyCheckResult, setTaxonomyCheckResult] =
    useState<TaxonomyCheckResult | null>(null);
  const [pendingValues, setPendingValues] = useState<QuestionFormValues | null>(null);
  const [isTaxonomyModalOpen, setIsTaxonomyModalOpen] = useState(false);
  const [isCreatingTaxonomies, setIsCreatingTaxonomies] = useState(false);

  const schema = useMemo(
    () => (isDiscursive ? frSchema : mcqSchema),
    [isDiscursive]
  );

  // ---------- Helpers para montar defaults ----------

  const initialSubjects = (question.subjects || []).map((s) => s.subject.slug);

  const initialSkills = (question.skills || [])
    .map((s) => s.skill.code?.toUpperCase() || "")
    .filter(Boolean);

  const mcq = question.mcq ?? null;
  const fr = question.fr ?? null;

  const effectiveOptionCount =
    !isDiscursive && mcq ? mcq.optionCount : (defaultOptionCount ?? 5);

  const getOptionText = (label: "A" | "B" | "C" | "D" | "E") =>
    mcq?.options.find((o) => o.label === label)?.textPlain || "";

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(schema) as Resolver<QuestionFormValues>,
    defaultValues: {
      examPhaseId: question.examPhaseId,
      numberLabel: question.numberLabel,
      subjects: initialSubjects,
      skills: initialSkills,
      status: question.status ?? "DRAFT",
      stimulusText: question.stimulus?.contentHtml || "",
      stimulusSourceRef: question.stimulus?.sourceRef || "",

      optionCount: effectiveOptionCount === 4 ? "4" : "5",
      shuffleOptions: mcq?.shuffleOptions ?? true,
      correctOptionKey: mcq?.correctOptionKey ?? "A",
      optionA: getOptionText("A"),
      optionB: getOptionText("B"),
      optionC: getOptionText("C"),
      optionD: getOptionText("D"),
      optionE: getOptionText("E"),

      frMaxScore: fr?.maxScore ?? 10,
      frAnswerGuidanceHtml: fr?.answerGuidanceHtml ?? "",
      frExpectedAnswerHtml: fr?.expectedAnswers?.[0]?.answerHtml ?? "",
    },
  });

  const hasOptionE = effectiveOptionCount === 5;

  const { uploadImage, isUploading: isUploadingImage } = useQuestionImageUpload();

  const handleMarkdownImageUpload = async (file: File): Promise<string> => {
    try {
      return await uploadImage(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
      throw err;
    }
  };

  // ---------- Carregar taxonomias ----------

  // State is only set in promise callbacks, so this can start from an effect.
  const fetchTaxonomies = useCallback(
    () =>
      requestTaxonomies<SubjectOption, SkillOption>()
        .then(({ subjects, skills }) => {
          setSubjectsOptions(subjects);
          setSkillsOptions(skills);
        })
        .catch((err) => {
          console.error(err);
          toast.error(errorMessage(err) || "Não foi possível carregar subjects/skills da API.");
        })
        .finally(() => setIsLoadingTaxonomies(false)),
    [],
  );

  useEffect(() => {
    fetchTaxonomies();
  }, [fetchTaxonomies]);

  // ---------- Taxonomy check + create ----------

  function checkMissingTaxonomies(values: QuestionFormValues): TaxonomyCheckResult | null {
    const existingSubjectSlugs = new Set(subjectsOptions.map((s) => s.slug));
    const existingSkillCodes = new Set(
      skillsOptions
        .map((s) => s.code?.toUpperCase())
        .filter(Boolean) as string[]
    );

    const selectedSubjects: string[] = values.subjects || [];
    const selectedSkills: string[] = values.skills || [];

    const missingSubjects = selectedSubjects.filter(
      (slug) => !existingSubjectSlugs.has(slug)
    );

    const missingSkills = selectedSkills.filter(
      (code) => !existingSkillCodes.has(code.toUpperCase())
    );

    if (missingSubjects.length === 0 && missingSkills.length === 0) {
      return null;
    }

    return { missingSubjects, missingSkills };
  }

  async function createMissingTaxonomies(result: TaxonomyCheckResult) {
    const { missingSubjects, missingSkills } = result;

    if (
      (!missingSubjects || missingSubjects.length === 0) &&
      (!missingSkills || missingSkills.length === 0)
    ) {
      return;
    }

    await Promise.all([
      ...missingSubjects.map((slug) =>
        fetch("/api/subject/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            name: slug,
          }),
        })
      ),
      ...missingSkills.map((code) =>
        fetch("/api/skill/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            label: code,
          }),
        })
      ),
    ]);

    setIsLoadingTaxonomies(true);
    await fetchTaxonomies();
  }

  // ---------- Update question ----------

  async function updateQuestion(values: QuestionFormValues) {
    const subjectsArray =
      values.subjects && values.subjects.length > 0
        ? (values.subjects as string[])
        : undefined;

    const skillsArray =
      values.skills && values.skills.length > 0
        ? (values.skills as string[])
        : undefined;

    const stimulus = {
      contentHtml: values.stimulusText,
      contentText: undefined,
      sourceRef: values.stimulusSourceRef || undefined,
    };

    const payload: Record<string, unknown> = {
      numberLabel: values.numberLabel,
      isDiscursive,
      status: values.status,
      subjects: subjectsArray,
      skills: skillsArray,
      stimulus,
    };

    if (!isDiscursive) {
      const count = Number(values.optionCount);

      const options: McqOption[] = [
        { label: "A", textPlain: values.optionA ?? "" },
        { label: "B", textPlain: values.optionB ?? "" },
        { label: "C", textPlain: values.optionC ?? "" },
        { label: "D", textPlain: values.optionD ?? "" },
      ];

      if (count === 5 && values.optionE) {
        options.push({ label: "E", textPlain: values.optionE });
      }

      payload.mcq = {
        optionCount: count,
        shuffleOptions: values.shuffleOptions,
        correctOptionKey: values.correctOptionKey,
        options,
      };
    } else {
      payload.fr = {
        maxScore: values.frMaxScore,
        answerGuidanceHtml: values.frAnswerGuidanceHtml || undefined,
        expectedAnswers: [
          {
            label: "Modelo",
            answerHtml: values.frExpectedAnswerHtml,
            maxScore: values.frMaxScore,
          },
        ],
      };
    }

    const res = await fetch(`/api/question/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error?.message || "Erro ao atualizar questão.");
    }
    toast.success("Questão atualizada com sucesso!");
    router.push(`/dashboard/admin/provas-questoes/${slug}/${id}/${idPhase}`);
  }

  // ---------- onSubmit ----------

  async function onSubmit(values: QuestionFormValues) {
    try {
      setIsSubmitting(true);

      const result = checkMissingTaxonomies(values);

      if (result) {
        setPendingValues(values);
        setTaxonomyCheckResult(result);
        setIsTaxonomyModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      await updateQuestion(values);
    } catch (err) {
      console.error(err);
      toast.error(errorMessage(err) || "Erro inesperado ao atualizar questão.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmCreateTaxonomies() {
    if (!pendingValues || !taxonomyCheckResult) return;

    try {
      setIsCreatingTaxonomies(true);
      await createMissingTaxonomies(taxonomyCheckResult);
      setIsTaxonomyModalOpen(false);
      setTaxonomyCheckResult(null);

      await updateQuestion(pendingValues);
      setPendingValues(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar novas taxonomias.");
    } finally {
      setIsCreatingTaxonomies(false);
    }
  }

  // ---------- Render ----------

  if (isLoadingTaxonomies) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        Carregando dados de subjects e skills...
      </div>
    );
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados básicos */}
          <div className="space-y-4 rounded-md border p-4">
            <h2 className="text-sm font-semibold">Dados da questão</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="numberLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da questão</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 1, 10, 5A..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status da questão</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        <SelectItem value="DRAFT">Rascunho</SelectItem>
                        <SelectItem value="PUBLISHED">Publicado</SelectItem>
                        <SelectItem value="ARCHIVED">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Subjects */}
            <FormField
              control={form.control}
              name="subjects"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assuntos (subjects)</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Clique para selecionar um ou mais assuntos existentes ou
                        adicione um novo slug. Se o slug não existir no banco,
                        será perguntado se você quer criá-lo.
                      </p>

                      {/* Chips com todas as taxonomias */}
                      <div className="flex flex-wrap gap-2">
                        {subjectsOptions.map((subject) => {
                          const selected = (field.value || []).includes(
                            subject.slug
                          );

                          return (
                            <button
                              key={subject.id}
                              type="button"
                              className={[
                                "rounded-full border px-3 py-1 text-xs sm:text-sm transition",
                                selected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-muted-foreground hover:bg-accent",
                              ].join(" ")}
                              onClick={() => {
                                const current: string[] = field.value || [];
                                if (selected) {
                                  field.onChange(
                                    current.filter(
                                      (s: string) => s !== subject.slug
                                    )
                                  );
                                } else {
                                  field.onChange([...current, subject.slug]);
                                }
                              }}
                            >
                              {subject.name}
                            </button>
                          );
                        })}
                      </div>

                      {/* Input para subject livre */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Novo subject (slug, ex: geometria-analitica)"
                          value={subjectInput}
                          onChange={(e) => setSubjectInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              const slug = subjectInput.trim();
                              if (!slug) return;
                              const current: string[] = field.value || [];
                              if (!current.includes(slug)) {
                                field.onChange([...current, slug]);
                              }
                              setSubjectInput("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const slug = subjectInput.trim();
                            if (!slug) return;
                            const current: string[] = field.value || [];
                            if (!current.includes(slug)) {
                              field.onChange([...current, slug]);
                            }
                            setSubjectInput("");
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>

                      {/* Lista de selecionados */}
                      {field.value && field.value.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
                          {field.value.map((slug: string) => {
                            const subject = subjectsOptions.find(
                              (s) => s.slug === slug
                            );
                            const exists = !!subject;

                            return (
                              <span
                                key={slug}
                                className={[
                                  "flex items-center gap-1 rounded-full px-3 py-1 text-xs",
                                  exists
                                    ? "bg-primary/10"
                                    : "bg-yellow-100 text-yellow-900 border border-yellow-400",
                                ].join(" ")}
                              >
                                {subject?.name ?? slug}
                                {!exists && (
                                  <span className="text-[10px] uppercase">
                                    (novo)
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className="ml-1 text-[10px]"
                                  onClick={() =>
                                    field.onChange(
                                      (field.value ?? []).filter(
                                        (s: string) => s !== slug
                                      )
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Skills */}
            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills (códigos)</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Digite o código (ex: H01, H15) e pressione Enter para
                        adicionar. Se a skill não existir no banco, será
                        oferecida a opção de criá-la.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ex: H01"
                          value={skillInput}
                          onChange={(e) =>
                            setSkillInput(e.target.value.toUpperCase())
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              const code = skillInput.trim().toUpperCase();
                              if (!code) return;
                              const current: string[] = field.value || [];
                              if (!current.includes(code)) {
                                field.onChange([...current, code]);
                              }
                              setSkillInput("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const code = skillInput.trim().toUpperCase();
                            if (!code) return;
                            const current: string[] = field.value || [];
                            if (!current.includes(code)) {
                              field.onChange([...current, code]);
                            }
                            setSkillInput("");
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>

                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((code: string) => {
                            const skill = skillsOptions.find(
                              (s) =>
                                s.code?.toUpperCase() === code.toUpperCase()
                            );
                            const exists = !!skill;

                            return (
                              <span
                                key={code}
                                className={[
                                  "flex items-center gap-1 rounded-full px-3 py-1 text-xs",
                                  exists
                                    ? "bg-secondary"
                                    : "bg-yellow-100 text-yellow-900 border border-yellow-400",
                                ].join(" ")}
                              >
                                {exists ? (
                                  <>
                                    {skill!.label}
                                    {skill!.code && (
                                      <span className="text-[10px] opacity-70">
                                        ({skill!.code})
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  code
                                )}

                                {!exists && (
                                  <span className="text-[10px] uppercase">
                                    (nova)
                                  </span>
                                )}

                                <button
                                  type="button"
                                  className="ml-1 text-[10px]"
                                  onClick={() =>
                                    field.onChange(
                                      (field.value ?? []).filter(
                                        (c: string) => c !== code
                                      )
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Estímulo */}
          <div className="space-y-4 rounded-md border p-4">
            <h2 className="text-sm font-semibold">Estímulo</h2>

            <FormField
              control={form.control}
              name="stimulusText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto do estímulo (Markdown)</FormLabel>
                  <FormControl>
                    <div className="overflow-hidden rounded-md border">
                      <MdEditor
                        style={{ height: 300 }}
                        value={field.value || ""}
                        renderHTML={(text) => mdParser.render(text)}
                        onChange={({ text }) => field.onChange(text)}
                        onImageUpload={handleMarkdownImageUpload}
                        config={{
                          view: { menu: true, md: true, html: true },
                          canView: {
                            menu: true,
                            md: true,
                            html: true,
                            both: true,
                            fullScreen: true,
                            hideMenu: true,
                          },
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stimulusSourceRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referência da fonte</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: ENEM 2023 - Prova Azul"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* MCQ */}
          {!isDiscursive && (
            <div className="space-y-4 rounded-md border p-4">
              <h2 className="text-sm font-semibold">
                Questão objetiva (MCQ) – {effectiveOptionCount} alternativas
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="correctOptionKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternativa correta</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["A", "B", "C", "D"].map((letter) => (
                            <SelectItem key={letter} value={letter}>
                              {letter}
                            </SelectItem>
                          ))}
                          {hasOptionE && <SelectItem value="E">E</SelectItem>}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-4">
                {/* A */}
                <FormField
                  control={form.control}
                  name="optionA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternativa A (Markdown)</FormLabel>
                      <FormControl>
                        <div className="overflow-hidden rounded-md border">
                          <MdEditor
                            style={{ height: 180 }}
                            value={field.value || ""}
                            renderHTML={(text) => mdParser.render(text)}
                            onChange={({ text }) => field.onChange(text)}
                            onImageUpload={handleMarkdownImageUpload}
                            config={{
                              view: { menu: true, md: true, html: true },
                              canView: {
                                menu: true,
                                md: true,
                                html: true,
                                both: true,
                                fullScreen: true,
                                hideMenu: true,
                              },
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* B */}
                <FormField
                  control={form.control}
                  name="optionB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternativa B (Markdown)</FormLabel>
                      <FormControl>
                        <div className="overflow-hidden rounded-md border">
                          <MdEditor
                            style={{ height: 180 }}
                            value={field.value || ""}
                            renderHTML={(text) => mdParser.render(text)}
                            onChange={({ text }) => field.onChange(text)}
                            onImageUpload={handleMarkdownImageUpload}
                            config={{
                              view: { menu: true, md: true, html: true },
                              canView: {
                                menu: true,
                                md: true,
                                html: true,
                                both: true,
                                fullScreen: true,
                                hideMenu: true,
                              },
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* C */}
                <FormField
                  control={form.control}
                  name="optionC"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternativa C (Markdown)</FormLabel>
                      <FormControl>
                        <div className="overflow-hidden rounded-md border">
                          <MdEditor
                            style={{ height: 180 }}
                            value={field.value || ""}
                            renderHTML={(text) => mdParser.render(text)}
                            onChange={({ text }) => field.onChange(text)}
                            onImageUpload={handleMarkdownImageUpload}
                            config={{
                              view: { menu: true, md: true, html: true },
                              canView: {
                                menu: true,
                                md: true,
                                html: true,
                                both: true,
                                fullScreen: true,
                                hideMenu: true,
                              },
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* D */}
                <FormField
                  control={form.control}
                  name="optionD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternativa D (Markdown)</FormLabel>
                      <FormControl>
                        <div className="overflow-hidden rounded-md border">
                          <MdEditor
                            style={{ height: 180 }}
                            value={field.value || ""}
                            renderHTML={(text) => mdParser.render(text)}
                            onChange={({ text }) => field.onChange(text)}
                            onImageUpload={handleMarkdownImageUpload}
                            config={{
                              view: { menu: true, md: true, html: true },
                              canView: {
                                menu: true,
                                md: true,
                                html: true,
                                both: true,
                                fullScreen: true,
                                hideMenu: true,
                              },
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* E opcional */}
                {hasOptionE && (
                  <FormField
                    control={form.control}
                    name="optionE"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alternativa E (Markdown)</FormLabel>
                        <FormControl>
                          <div className="overflow-hidden rounded-md border">
                            <MdEditor
                              style={{ height: 180 }}
                              value={field.value || ""}
                              renderHTML={(text) => mdParser.render(text)}
                              onChange={({ text }) => field.onChange(text)}
                              onImageUpload={handleMarkdownImageUpload}
                              config={{
                                view: { menu: true, md: true, html: true },
                                canView: {
                                  menu: true,
                                  md: true,
                                  html: true,
                                  both: true,
                                  fullScreen: true,
                                  hideMenu: true,
                                },
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          )}

          {/* Discursiva */}
          {isDiscursive && (
            <div className="space-y-4 rounded-md border p-4">
              <h2 className="text-sm font-semibold">Questão discursiva (FR)</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="frMaxScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nota máxima (maxScore)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frAnswerGuidanceHtml"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orientação ao corretor (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: considerar domínio da norma culta..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="frExpectedAnswerHtml"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resposta modelo</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Cole aqui uma resposta exemplo / gabarito comentado..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || isUploadingImage}>
            {isSubmitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </Form>

      {/* Modal de criação de taxonomias */}
      <Dialog open={isTaxonomyModalOpen} onOpenChange={setIsTaxonomyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Subjects/skills não encontrados
            </DialogTitle>
            <DialogDescription>
              Alguns subjects ou skills informados não existem no banco de
              dados. Deseja criá-los agora e continuar?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {taxonomyCheckResult?.missingSubjects?.length ? (
              <div>
                <p className="font-semibold">Subjects inexistentes:</p>
                <ul className="list-disc list-inside">
                  {taxonomyCheckResult.missingSubjects.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {taxonomyCheckResult?.missingSkills?.length ? (
              <div>
                <p className="font-semibold">Skills inexistentes:</p>
                <ul className="list-disc list-inside">
                  {taxonomyCheckResult.missingSkills.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsTaxonomyModalOpen(false);
                setTaxonomyCheckResult(null);
                setPendingValues(null);
              }}
            >
              Voltar e editar
            </Button>
            <Button
              onClick={handleConfirmCreateTaxonomies}
              disabled={isCreatingTaxonomies}
            >
              {isCreatingTaxonomies ? "Criando..." : "Criar e salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
