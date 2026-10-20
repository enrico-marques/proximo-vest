import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { isQuestionImagePathname } from "@/lib/blob";
import { defineRoute } from "@/server/auth/define-route";

const OptionKey = z.enum(["A","B","C","D","E"]);
const ItemSchema = z.object({
  examPhaseId: z.number().int(),
  numberLabel: z.string(),
  isDiscursive: z.boolean(),
  subjects: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  stimulus: z.object({
    contentHtml: z.string().optional(),
    contentText: z.string().optional(),
    sourceRef: z.string().optional(),
    assets: z.array(z.object({
      storageKey: z.string().refine(isQuestionImagePathname, "storageKey deve ser um caminho do armazenamento (questions/...)"),
      caption: z.string().optional(),
      pageHint: z.number().int().optional(),
    })).optional(),
  }).optional(),
  mcq: z.object({
    optionCount: z.number().int().min(4).max(5),
    shuffleOptions: z.boolean().optional(),
    correctOptionKey: OptionKey,
    options: z.array(z.object({ label: OptionKey, textHtml: z.string().optional(), textPlain: z.string().optional() })).min(4).max(5),
  }).optional(),
  fr: z.object({
    maxScore: z.number().optional(),
    answerGuidanceHtml: z.string().optional(),
    expectedAnswers: z.array(z.object({ label: z.string().optional(), answerHtml: z.string().optional(), maxScore: z.number().optional() })).optional(),
    rubrics: z.array(z.object({ criterion: z.string(), levelsJson: z.record(z.string(), z.string()) })).optional(),
  }).optional(),
  sourcePageStart: z.number().optional(),
  sourcePageEnd: z.number().optional(),
});

const Schema = z.object({
  items: z.array(ItemSchema).min(1),
  onConflict: z.enum(["UPSERT","SKIP","ERROR"]).default("UPSERT")
});

export const POST = defineRoute({ perm: "question.batch" }, async (req) => {
  const { items, onConflict } = Schema.parse(await req.json());
  const errors: { index: number; message: string }[] = [];
  let ok = 0, skipped = 0;

  for (let i=0; i<items.length; i++) {
    const it = items[i];
    try {
      // existe?
      const existing = await prisma.question.findFirst({
        where: { examPhaseId: it.examPhaseId, numberLabel: it.numberLabel },
        select: { id: true }
      });
      if (existing && onConflict === "SKIP") { skipped++; continue; }
      if (existing && onConflict === "ERROR") throw new Error("duplicate (examPhaseId, numberLabel)");

      // cria stimulus (se houver)
      let stimulusId: number | undefined = undefined;
      if (it.stimulus) {
        const st = await prisma.stimulus.create({
          data: {
            contentHtml: it.stimulus.contentHtml,
            contentText: it.stimulus.contentText,
            sourceRef: it.stimulus.sourceRef,
            assets: it.stimulus.assets?.length ? { create: it.stimulus.assets } : undefined
          }
        });
        stimulusId = st.id;
      }

      // subject/skill links
      const subjects = it.subjects?.length
        ? await Promise.all(it.subjects.map(async (slug)=> {
            const s = await prisma.subject.findUnique({ where: { slug } });
            if (!s) throw new Error(`Subject not found: ${slug}`);
            return { subjectId: s.id };
          }))
        : [];

      const skills = it.skills?.length
        ? await Promise.all(it.skills.map(async (code)=> {
            const sk = await prisma.skill.findUnique({ where: { code } });
            if (!sk) throw new Error(`Skill not found: ${code}`);
            return { skillId: sk.id };
          }))
        : [];

      // upsert (se permitido)
      if (existing && onConflict === "UPSERT") {
        await prisma.question.update({
          where: { id: existing.id },
          data: {
            isDiscursive: it.isDiscursive,
            sourcePageStart: it.sourcePageStart,
            sourcePageEnd: it.sourcePageEnd,
            stimulusId,
            // simplificado: não sobrescrevo vínculos antigos aqui; faça se quiser
          }
        });
        ok++; continue;
      }

      // create
      await prisma.question.create({
        data: {
          examPhaseId: it.examPhaseId,
          numberLabel: it.numberLabel,
          isDiscursive: it.isDiscursive,
          sourcePageStart: it.sourcePageStart,
          sourcePageEnd: it.sourcePageEnd,
          stimulusId,
          subjects: subjects.length ? { create: subjects } : undefined,
          skills: skills.length ? { create: skills } : undefined,
          mcq: !it.isDiscursive && it.mcq ? {
            create: {
              optionCount: it.mcq.optionCount,
              shuffleOptions: it.mcq.shuffleOptions ?? true,
              correctOptionKey: it.mcq.correctOptionKey,
              options: { create: it.mcq.options }
            }
          } : undefined,
          fr: it.isDiscursive && it.fr ? {
            create: {
              maxScore: it.fr.maxScore,
              answerGuidanceHtml: it.fr.answerGuidanceHtml,
              expectedAnswers: it.fr.expectedAnswers?.length ? { create: it.fr.expectedAnswers } : undefined,
              rubrics: it.fr.rubrics?.length ? { create: it.fr.rubrics } : undefined
            }
          } : undefined
        }
      });
      ok++;
    } catch (e) {
      errors.push({ index: i, message: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ summary: { ok, skipped, errors: errors.length }, errors });
});
