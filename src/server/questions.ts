import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/server/auth/define-route";
import type { PermissionRequirement } from "@/utils/access-core";

// Read permissions live next to the queries so API routes and pages cannot drift apart.
export const QUESTION_READ = ["question.read", "question.create", "question.update"] as const satisfies PermissionRequirement;

export const QUESTION_LIST_INCLUDES = [
  "stimulus",
  "subjects",
  "skills",
  "mcq",
  "fr",
  "expectedAnswers",
  "rubrics",
  "options",
] as const;

export type QuestionListInclude = (typeof QUESTION_LIST_INCLUDES)[number];

/** Page and page size from untrusted search params; bad values fall back instead of failing. */
export const questionPageSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
});

export type QuestionListQuery = {
  examPhaseId?: number;
  subject?: string;
  isDiscursive?: boolean;
  include?: QuestionListInclude[];
  orderBy?: "id" | "numberLabel" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function listQuestions({
  examPhaseId,
  subject,
  isDiscursive,
  include = [],
  orderBy = "numberLabel",
  order = "asc",
  page = 1,
  pageSize = 50,
}: QuestionListQuery = {}) {
  const where: Prisma.QuestionWhereInput = {};
  if (examPhaseId) where.examPhaseId = examPhaseId;
  if (typeof isDiscursive === "boolean") where.isDiscursive = isDiscursive;
  if (subject) where.subjects = { some: { subject: { slug: subject } } };

  const has = (key: QuestionListInclude) => include.includes(key);
  const selectInclude = {
    stimulus: has("stimulus") ? { include: { assets: true } } : false,
    subjects: has("subjects") ? { include: { subject: true } } : false,
    skills: has("skills") ? { include: { skill: true } } : false,
    mcq: has("mcq") || has("options") ? { include: { options: true } } : false,
    fr:
      has("fr") || has("expectedAnswers") || has("rubrics")
        ? { include: { expectedAnswers: has("expectedAnswers"), rubrics: has("rubrics") } }
        : false,
  };

  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      // id breaks ties so rows never repeat or vanish between pages.
      orderBy: orderBy === "id" ? { id: order } : [{ [orderBy]: order }, { id: order }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: selectInclude,
    }),
    prisma.question.count({ where }),
  ]);

  return { total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), items };
}

const questionDetailInclude = {
  stimulus: { include: { assets: true } },
  subjects: { include: { subject: true } },
  skills: { include: { skill: true } },
  mcq: { include: { options: true } },
  fr: { include: { expectedAnswers: true, rubrics: true } },
} satisfies Prisma.QuestionInclude;

type QuestionDetailRow = Prisma.QuestionGetPayload<{ include: typeof questionDetailInclude }>;

// Decimal instances cannot cross into Client Components, so scores leave the server as numbers.
function toPlainQuestion(question: QuestionDetailRow) {
  const { fr } = question;
  return {
    ...question,
    fr: fr && {
      ...fr,
      maxScore: fr.maxScore?.toNumber() ?? null,
      expectedAnswers: fr.expectedAnswers.map((a) => ({ ...a, maxScore: a.maxScore?.toNumber() ?? null })),
    },
  };
}

export type QuestionDetail = ReturnType<typeof toPlainQuestion>;

export async function getQuestionDetail(id: number) {
  const question = await prisma.question.findUnique({ where: { id }, include: questionDetailInclude });
  return question && toPlainQuestion(question);
}

const optionKey = z.enum(["A", "B", "C", "D", "E"]);

// Mirrors what EditQuestionForm and ApproveQuestionButton send; strict so a new field
// in the form fails loudly instead of being dropped.
export const questionUpdateSchema = z
  .object({
    numberLabel: z.string().trim().min(1).optional(),
    isDiscursive: z.boolean().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    sourcePageStart: z.number().int().nullable().optional(),
    sourcePageEnd: z.number().int().nullable().optional(),
    stimulus: z
      .object({
        contentHtml: z.string(),
        contentText: z.string().nullable().optional(),
        sourceRef: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
    // Present = replace the whole set; absent = keep it.
    subjects: z.array(z.string().trim().min(1)).optional(),
    skills: z.array(z.string().trim().min(1)).optional(),
    mcq: z
      .object({
        optionCount: z.number().int().min(4).max(5).optional(),
        shuffleOptions: z.boolean().optional(),
        correctOptionKey: optionKey.optional(),
        options: z
          .array(
            z
              .object({ label: optionKey, textHtml: z.string().optional(), textPlain: z.string().optional() })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
    fr: z
      .object({
        maxScore: z.number().nonnegative().optional(),
        answerGuidanceHtml: z.string().optional(),
        expectedAnswers: z
          .array(
            z
              .object({
                label: z.string().optional(),
                answerHtml: z.string().optional(),
                maxScore: z.number().nonnegative().optional(),
              })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;

async function resolveTaxonomy(tx: Prisma.TransactionClient, subjects?: string[], skills?: string[]) {
  const [foundSubjects, foundSkills] = await Promise.all([
    subjects?.length ? tx.subject.findMany({ where: { slug: { in: subjects } }, select: { id: true, slug: true } }) : [],
    skills?.length ? tx.skill.findMany({ where: { code: { in: skills } }, select: { id: true, code: true } }) : [],
  ]);

  const missingSubjects = (subjects ?? []).filter((slug) => !foundSubjects.some((s) => s.slug === slug));
  const missingSkills = (skills ?? []).filter((code) => !foundSkills.some((s) => s.code === code));
  if (missingSubjects.length || missingSkills.length) {
    const parts = [
      missingSubjects.length && `disciplinas não cadastradas: ${missingSubjects.join(", ")}`,
      missingSkills.length && `habilidades não cadastradas: ${missingSkills.join(", ")}`,
    ].filter(Boolean);
    throw new HttpError(400, parts.join("; "));
  }

  return { subjectIds: foundSubjects.map((s) => s.id), skillIds: foundSkills.map((s) => s.id) };
}

/** Applies a partial edit atomically: either every part of the question changes or none does. */
export async function updateQuestion(id: number, input: QuestionUpdateInput) {
  const { mcq, fr, subjects, skills, stimulus, ...fields } = input;

  await prisma.$transaction(async (tx) => {
    const current = await tx.question.findUnique({ where: { id }, select: { stimulusId: true } });
    if (!current) throw new HttpError(404, "Questão não encontrada");

    const { subjectIds, skillIds } = await resolveTaxonomy(tx, subjects, skills);

    const data: Prisma.QuestionUpdateInput = { ...fields };
    if (stimulus) {
      const content = {
        contentHtml: stimulus.contentHtml,
        contentText: stimulus.contentText ?? null,
        sourceRef: stimulus.sourceRef ?? null,
      };
      data.stimulus = current.stimulusId ? { update: content } : { create: content };
    }
    if (subjects) {
      data.subjects = { deleteMany: {}, create: [...new Set(subjectIds)].map((subjectId) => ({ subjectId })) };
    }
    if (skills) {
      data.skills = { deleteMany: {}, create: [...new Set(skillIds)].map((skillId) => ({ skillId })) };
    }

    const updated = await tx.question.update({ where: { id }, data, select: { isDiscursive: true } });

    if (mcq && !updated.isDiscursive) {
      await tx.mcqItem.upsert({
        where: { questionId: id },
        update: {
          optionCount: mcq.optionCount,
          shuffleOptions: mcq.shuffleOptions,
          correctOptionKey: mcq.correctOptionKey,
        },
        create: {
          questionId: id,
          optionCount: mcq.optionCount ?? 5,
          shuffleOptions: mcq.shuffleOptions ?? true,
          correctOptionKey: mcq.correctOptionKey ?? "A",
        },
      });

      if (mcq.options?.length) {
        await tx.mcqOption.deleteMany({ where: { questionId: id } });
        await tx.mcqOption.createMany({
          data: mcq.options.map((o) => ({ questionId: id, label: o.label, textHtml: o.textHtml, textPlain: o.textPlain })),
        });
      }
    }

    if (fr && updated.isDiscursive) {
      await tx.frItem.upsert({
        where: { questionId: id },
        update: { maxScore: fr.maxScore, answerGuidanceHtml: fr.answerGuidanceHtml },
        create: { questionId: id, maxScore: fr.maxScore, answerGuidanceHtml: fr.answerGuidanceHtml },
      });

      if (fr.expectedAnswers) {
        await tx.frAnswerExpected.deleteMany({ where: { frItemId: id } });
        if (fr.expectedAnswers.length) {
          await tx.frAnswerExpected.createMany({
            data: fr.expectedAnswers.map((a) => ({
              frItemId: id,
              label: a.label,
              answerHtml: a.answerHtml,
              maxScore: a.maxScore,
            })),
          });
        }
      }
    }
  });

  return getQuestionDetail(id);
}
