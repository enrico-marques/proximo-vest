import { prisma } from "../../../../lib/prisma"
import { NextRequest } from "next/server"
import { z } from "zod"
import { json, tryCatch } from "../../_utils"
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  examPhaseId: z.coerce.number().int().optional(),
  subject: z.string().optional(), // slug
  isDiscursive: z.coerce.boolean().optional(),
  include: z
    .array(
      z.enum([
        "stimulus",
        "subjects",
        "skills",
        "mcq",
        "fr",
        "expectedAnswers",
        "rubrics",
        "options",
      ])
    )
    .optional(),
  orderBy: z.enum(["id", "numberLabel", "createdAt"]).default("numberLabel"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})

export const GET = defineRoute({ perm: ["question.read", "question.create", "question.update"] }, async (req) => {
  return tryCatch(async () => {
    const { searchParams } = new URL(req.url)

    // Suporta: ?include=a&include=b e também ?include=a,b
    const includeParams = searchParams
      .getAll("include")
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean)

    const parsed = Schema.parse({
      examPhaseId: searchParams.get("examPhaseId"),
      subject: searchParams.get("subject") ?? undefined,
      isDiscursive: searchParams.get("isDiscursive") ?? undefined,
      include: includeParams.length ? (includeParams as any) : undefined,
      orderBy: (searchParams.get("orderBy") as any) ?? undefined,
      order: (searchParams.get("order") as any) ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    })

    const { examPhaseId, subject, isDiscursive, include, orderBy, order, page, pageSize } = parsed

    const where: any = {}
    if (examPhaseId) where.examPhaseId = examPhaseId
    if (typeof isDiscursive === "boolean") where.isDiscursive = isDiscursive
    if (subject) where.subjects = { some: { subject: { slug: subject } } }

    const selectInclude = {
      stimulus: include?.includes("stimulus") ? { include: { assets: true } } : false,
      subjects: include?.includes("subjects") ? { include: { subject: true } } : false,
      skills: include?.includes("skills") ? { include: { skill: true } } : false,
      mcq:
        include?.includes("mcq") || include?.includes("options")
          ? { include: { options: true } }
          : false,
      fr:
        include?.includes("fr") ||
        include?.includes("expectedAnswers") ||
        include?.includes("rubrics")
          ? {
              include: {
                expectedAnswers: include?.includes("expectedAnswers"),
                rubrics: include?.includes("rubrics"),
              },
            }
          : false,
    }

    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { [orderBy]: order },
        skip,
        take: pageSize,
        include: selectInclude,
      }),
      prisma.question.count({ where }),
    ])

    return json({ total, page, pageSize, items })
  })
});
