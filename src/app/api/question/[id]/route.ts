import { prisma } from "../../../../lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { json, readBody, notFound, badRequest } from "../../_utils";
import { defineRoute } from "@/server/auth/define-route";
import { QUESTION_READ, getQuestionDetail } from "@/server/questions";


type Params = { id: string };

export const GET = defineRoute<Params>({ perm: QUESTION_READ }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  const found = await getQuestionDetail(id);
  if (!found) return notFound("Question not found");
  return json(found);
});

const OptionKey = z.enum(["A", "B", "C", "D", "E"]);

const PatchSchema = z.object({
  // campos básicos da questão
  numberLabel: z.string().optional(),
  isDiscursive: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sourcePageStart: z.number().optional(),
  sourcePageEnd: z.number().optional(),

  // estímulo (mesma estrutura que você manda no front)
  stimulus: z
    .object({
      contentHtml: z.string(),
      contentText: z.string().nullable().optional(),
      sourceRef: z.string().nullable().optional(),
    })
    .optional(),

  // taxonomias (slugs/códigos)
  subjects: z.array(z.string()).optional(), // slugs
  skills: z.array(z.string()).optional(), // códigos (H01 etc.)

  // MCQ
  mcq: z
    .object({
      optionCount: z.number().int().min(4).max(5).optional(),
      shuffleOptions: z.boolean().optional(),
      correctOptionKey: OptionKey.optional(),
      options: z
        .array(
          z.object({
            label: OptionKey,
            textHtml: z.string().optional(),
            textPlain: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),

  // Discursiva
  fr: z
    .object({
      maxScore: z.number().optional(),
      answerGuidanceHtml: z.string().optional(),
      // se quiser, pode estender pra expectedAnswers também
    })
    .optional(),
});

export const PATCH = defineRoute<Params>({ perm: "question.update" }, async (req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  const parsed = PatchSchema.safeParse(await readBody(req));
  if (!parsed.success) return badRequest(parsed.error.message);
  const input = parsed.data;

  // pega o estado atual (pra ver se é discursiva/objetiva etc)
  const current = await prisma.question.findUnique({
    where: { id },
    include: { mcq: true, fr: true },
  });
  if (!current) return notFound("Question not found");

  // separa os pedaços que vão pro question e o resto
  const { mcq, fr, subjects, skills, stimulus, ...questionData } = input;

  // monta o data básico da questão
  const questionUpdateData: Prisma.QuestionUpdateInput = {
    ...questionData, // examPhaseId, numberLabel, isDiscursive, status, sourcePageStart/End
  };

  // se veio estímulo no PATCH, atualiza o relacionado
  if (stimulus) {
    questionUpdateData.stimulus = {
      update: {
        contentHtml: stimulus.contentHtml,
        contentText: stimulus.contentText ?? null,
        sourceRef: stimulus.sourceRef ?? null,
      },
    };
  }

  // ATENÇÃO: subjects/skills ainda não estão sendo tratados aqui.
  // Se quiser realmente editar as taxonomias via PATCH, dá pra adicionar
  // lógica de questionSubject/questionSkill parecido com seu endpoint de create.

  // atualiza cabeçalho + estímulo
  const updated = await prisma.question.update({
    where: { id },
    data: questionUpdateData,
  });

  // -------- MCQ --------
  if (mcq && !updated.isDiscursive) {
    await prisma.mcqItem.upsert({
      where: { questionId: id },
      update: {
        optionCount: mcq.optionCount ?? undefined,
        shuffleOptions: mcq.shuffleOptions ?? undefined,
        correctOptionKey: mcq.correctOptionKey ?? undefined,
      },
      create: {
        questionId: id,
        optionCount: mcq.optionCount ?? 5,
        shuffleOptions: mcq.shuffleOptions ?? true,
        correctOptionKey: mcq.correctOptionKey ?? "A",
      },
    });

    if (mcq.options?.length) {
      await prisma.mcqOption.deleteMany({ where: { questionId: id } });
      await prisma.mcqOption.createMany({
        data: mcq.options.map((o) => ({
          questionId: id,
          label: o.label,
          textHtml: o.textHtml,
          textPlain: o.textPlain,
        })),
      });
    }
  }

  // -------- FR --------
  if (fr && updated.isDiscursive) {
    await prisma.frItem.upsert({
      where: { questionId: id },
      update: {
        maxScore: fr.maxScore ?? undefined,
        answerGuidanceHtml: fr.answerGuidanceHtml ?? undefined,
      },
      create: {
        questionId: id,
        maxScore: fr.maxScore ?? undefined,
        answerGuidanceHtml: fr.answerGuidanceHtml ?? undefined,
      },
    });
  }

  // volta a questão completa (igual ao GET)
  const full = await getQuestionDetail(id);

  return json(full);
});

export const DELETE = defineRoute<Params>({ perm: "question.delete" }, async (_req, ctx) => {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  await prisma.question.delete({ where: { id } });
  return json({ ok: true });
});
