import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { isQuestionImagePathname } from "@/lib/blob";

import { readBody, tryCatch, badRequest } from "../../../api/_utils";
import { defineRoute } from "@/server/auth/define-route";

// ---------------- Zod Schemas ----------------
const OptionKey = z.enum(["A", "B", "C", "D", "E"]);

const StimulusAsset = z.object({
  storageKey: z.string().refine(isQuestionImagePathname, "storageKey deve ser um caminho do armazenamento (questions/...)"),
  caption: z.string().optional(),
  pageHint: z.number().int().optional(),
});

const Stimulus = z.object({
  contentHtml: z.string().optional(),
  contentText: z.string().optional(),
  sourceRef: z.string().optional(),
  assets: z.array(StimulusAsset).optional(),
});

const Mcq = z.object({
  optionCount: z.number().int().min(4).max(5),
  shuffleOptions: z.boolean().optional(),
  correctOptionKey: OptionKey,
  options: z
    .array(
      z.object({
        label: OptionKey,
        textHtml: z.string().optional(),
        textPlain: z.string().optional(),
      })
    )
    .min(4)
    .max(5),
});

const FrExpected = z.object({
  label: z.string().optional(),
  answerHtml: z.string().optional(),
  maxScore: z.number().optional(),
});

const FrRubric = z.object({
  criterion: z.string(),
  levelsJson: z.record(z.string(), z.string()),
});

const Fr = z.object({
  maxScore: z.number().optional(),
  answerGuidanceHtml: z.string().optional(),
  expectedAnswers: z.array(FrExpected).optional(),
  rubrics: z.array(FrRubric).optional(),
});

const Schema = z.object({
  examPhaseId: z.number().int(),
  numberLabel: z.string(),
  isDiscursive: z.boolean(),
  subjects: z.array(z.string()).optional(), // slugs
  skills: z.array(z.string()).optional(), // codes
  stimulus: Stimulus.optional(),
  mcq: Mcq.optional(),
  fr: Fr.optional(),
  sourcePageStart: z.number().optional(),
  sourcePageEnd: z.number().optional(),
});

// ---------------- Handler ----------------
export const POST = defineRoute({ perm: "question.create" }, async (req) => {
  return tryCatch(async () => {
    const parsed = Schema.safeParse(await readBody(req));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: parsed.error.message } },
        { status: 400 }
      );
    }
    const input = parsed.data;

    // 1) Criar Stimulus (se veio no payload)
    let stimulusId: number | undefined = undefined;
    if (input.stimulus) {
      const createdStimulus = await prisma.stimulus.create({
        data: {
          contentHtml: input.stimulus.contentHtml,
          contentText: input.stimulus.contentText,
          sourceRef: input.stimulus.sourceRef,
          // assets do estímulo são criados AQUI, pois StimulusAsset referencia Stimulus
          assets: input.stimulus.assets?.length
            ? { create: input.stimulus.assets }
            : undefined,
        },
        include: { assets: true },
      });
      stimulusId = createdStimulus.id;
    }

    // 2) Resolver subjects/skills (por slug/code)
    const subjectLinks = input.subjects?.length
      ? await Promise.all(
          input.subjects.map(async (slug) => {
            const s = await prisma.subject.findUnique({ where: { slug } });
            if (!s) throw new Error(`Subject not found: ${slug}`);
            return { subjectId: s.id };
          })
        )
      : [];

    const skillLinks = input.skills?.length
      ? await Promise.all(
          input.skills.map(async (code) => {
            const sk = await prisma.skill.findUnique({ where: { code } });
            if (!sk) throw new Error(`Skill not found: ${code}`);
            return { skillId: sk.id };
          })
        )
      : [];

    // 3) Criar Question (usando stimulusId ao invés de relação aninhada)
    const created = await prisma.question.create({
      data: {
        examPhaseId: input.examPhaseId,
        numberLabel: input.numberLabel,
        isDiscursive: input.isDiscursive,
        sourcePageStart: input.sourcePageStart,
        sourcePageEnd: input.sourcePageEnd,
        stimulusId, // <<— ponto-chave da opção 1
        subjects: subjectLinks.length ? { create: subjectLinks } : undefined,
        skills: skillLinks.length ? { create: skillLinks } : undefined,

        // MCQ
        mcq:
          !input.isDiscursive && input.mcq
            ? {
                create: {
                  optionCount: input.mcq.optionCount,
                  shuffleOptions: input.mcq.shuffleOptions ?? true,
                  correctOptionKey: input.mcq.correctOptionKey,
                  options: { create: input.mcq.options },
                },
              }
            : undefined,

        // Discursiva
        fr:
          input.isDiscursive && input.fr
            ? {
                create: {
                  maxScore: (input.fr.maxScore as any) ?? undefined, // Prisma.Decimal compat
                  answerGuidanceHtml: input.fr.answerGuidanceHtml,
                  expectedAnswers: input.fr.expectedAnswers?.length
                    ? { create: input.fr.expectedAnswers }
                    : undefined,
                  rubrics: input.fr.rubrics?.length
                    ? {
                        create: input.fr.rubrics.map((r) => ({
                          criterion: r.criterion,
                          levelsJson: r.levelsJson as any,
                        })),
                      }
                    : undefined,
                },
              }
            : undefined,
      },
      include: {
        // Stimulus já foi criado antes; aqui só “include” por conveniência
        stimulus: { include: { assets: true } },
        subjects: { include: { subject: true } },
        skills: { include: { skill: true } },
        mcq: { include: { options: true } },
        fr: { include: { expectedAnswers: true, rubrics: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  });
});
