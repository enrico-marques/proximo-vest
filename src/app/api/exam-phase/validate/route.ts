import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  examPhaseId: z.number().int(),
  includeDetails: z.boolean().optional().default(true), // se false, só traz resumo
});

export const POST = defineRoute({ perm: "examPhase.manage" }, async (req) => {
  try {
    const { examPhaseId, includeDetails } = Schema.parse(await req.json());

    // 1) Carrega fase
    const phase = await prisma.examPhase.findUnique({
      where: { id: examPhaseId },
      select: {
        id: true,
        questionCountExpected: true,
        defaultOptionCount: true,
        isDiscursive: true,
      },
    });
    if (!phase) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "ExamPhase not found" } },
        { status: 404 }
      );
    }

    // 2) Carrega questões mínimas p/ validação
    const questions = await prisma.question.findMany({
      where: { examPhaseId },
      orderBy: { numberLabel: "asc" },
      select: {
        id: true,
        numberLabel: true,
        isDiscursive: true,
        mcq: {
          select: {
            optionCount: true,
            options: { select: { id: true }, orderBy: { label: "asc" } },
          },
        },
        fr: { select: { questionId: true } },
      },
    });

    const found = questions.length;
    const expected = phase.questionCountExpected ?? null;
    const labels = questions.map((q: { numberLabel: any; }) => q.numberLabel);

    // 3) Duplicatas de numberLabel
    const duplicateMap = new Map<string, number>();
    for (const l of labels) duplicateMap.set(l, (duplicateMap.get(l) ?? 0) + 1);
    const duplicates = [...duplicateMap.entries()]
      .filter(([_, cnt]) => cnt > 1)
      .map(([label]) => label);

    // 4) Faltantes (se rótulos forem todos inteiros)
    const numeric = labels.every((l: string) => /^\d+$/.test(l));
    const missingNumbers: string[] = [];
    if (numeric) {
      const nums = labels.map((l: any) => Number(l)).sort((a: number, b: number) => a - b);
      const have = new Set(nums);
      // estratégia: se há "expected", checamos 1..expected;
      // caso contrário, usamos range min..max (útil p/ apontar furos internos)
      const start = expected ? 1 : nums[0];
      const end = expected ? expected : nums[nums.length - 1];
      for (let n = start; n <= end; n++) {
        if (!have.has(n)) missingNumbers.push(String(n));
      }
    }

    // 5) Diagnósticos de coerência com a fase
    const modeMismatch: { id: number; numberLabel: string; expected: "discursive" | "mcq"; got: "discursive" | "mcq" }[] = [];
    const optionCountMismatches: { id: number; numberLabel: string; phaseDefault?: number | null; questionOptionCount?: number | null }[] = [];
    const optionsLengthMismatches: { id: number; numberLabel: string; optionCount?: number | null; optionsLength?: number }[] = [];

    for (const q of questions) {
      // a) modo da questão vs fase
      const expectedMode = phase.isDiscursive ? "discursive" : "mcq";
      const gotMode = q.isDiscursive ? "discursive" : "mcq";
      if (expectedMode !== gotMode) {
        modeMismatch.push({
          id: q.id,
          numberLabel: q.numberLabel,
          expected: expectedMode,
          got: gotMode,
        });
      }

      // b) defaultOptionCount da fase vs optionCount da questão (apenas MCQ)
      if (!q.isDiscursive && phase.defaultOptionCount != null) {
        const qCount = q.mcq?.optionCount ?? null;
        if (qCount != null && qCount !== phase.defaultOptionCount) {
          optionCountMismatches.push({
            id: q.id,
            numberLabel: q.numberLabel,
            phaseDefault: phase.defaultOptionCount,
            questionOptionCount: qCount,
          });
        }
      }

      // c) número de opções salvas vs optionCount declarado (apenas MCQ)
      if (!q.isDiscursive && q.mcq?.optionCount != null) {
        const len = q.mcq.options.length;
        if (len !== q.mcq.optionCount) {
          optionsLengthMismatches.push({
            id: q.id,
            numberLabel: q.numberLabel,
            optionCount: q.mcq.optionCount,
            optionsLength: len,
          });
        }
      }
    }

    // 6) resumo
    const delta =
      expected == null ? null : Number(found) - Number(expected);
    const ok =
      duplicates.length === 0 &&
      (expected == null || delta === 0) &&
      (!numeric || missingNumbers.length === 0) &&
      modeMismatch.length === 0 &&
      optionCountMismatches.length === 0 &&
      optionsLengthMismatches.length === 0;

    // 7) resposta
    const base = {
      phase: {
        id: phase.id,
        isDiscursive: phase.isDiscursive,
        questionCountExpected: phase.questionCountExpected,
        defaultOptionCount: phase.defaultOptionCount,
      },
      totals: { expected, found, delta },
      ok,
    };

    if (!includeDetails) {
      return NextResponse.json(base);
    }

    return NextResponse.json({
      ...base,
      labels,
      duplicates,
      missingNumbers,
      diagnostics: {
        modeMismatch,
        optionCountMismatches,
        optionsLengthMismatches,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: e.message } },
      { status: 400 }
    );
  }
});
