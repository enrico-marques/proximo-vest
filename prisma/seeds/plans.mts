import type { PrismaClient } from "../../src/generated/prisma/client.ts";

// Starting catalog for an empty database. After the first run plans belong to the admin UI:
// this seed never touches existing plans, and Stripe price ids are filled in there.
// Limits: null = unlimited, 0 = not included. Columns of the other audience stay null.
const plans = [
  {
    label: "Free (Aluno)",
    description: "Acesso limitado às questões. Ideal para conhecer a plataforma.",
    audience: "STUDENT",
    monthlyPrice: null,
    questionsPerDay: 10,
    essayCreditsPerMonth: 0,
    isDefault: true,
    sortOrder: 0,
  },
  {
    label: "Premium (Aluno)",
    description: "Questões ilimitadas e 1 redação corrigida por mês.",
    audience: "STUDENT",
    monthlyPrice: 19.9,
    questionsPerDay: null,
    essayCreditsPerMonth: 1,
    sortOrder: 1,
  },
  {
    label: "Elite (Aluno)",
    description: "Questões ilimitadas e 4 redações corrigidas por mês.",
    audience: "STUDENT",
    monthlyPrice: 39.9,
    questionsPerDay: null,
    essayCreditsPerMonth: 4,
    highlight: true,
    sortOrder: 2,
  },
  {
    label: "Free (Professor)",
    description: "Até 5 listas por mês.",
    audience: "TEACHER",
    monthlyPrice: null,
    listsPerMonth: 5,
    isDefault: true,
    sortOrder: 0,
  },
  {
    label: "Premium (Professor)",
    description: "Listas ilimitadas.",
    audience: "TEACHER",
    monthlyPrice: 24.9,
    listsPerMonth: null,
    sortOrder: 1,
  },
] as const;

export async function seedPlans(prisma: PrismaClient) {
  if ((await prisma.plan.count()) > 0) {
    console.log("💳 Planos já cadastrados; nada a fazer.");
    return;
  }
  await prisma.plan.createMany({ data: [...plans] });
  console.log(`💳 ${plans.length} planos iniciais criados.`);
}
