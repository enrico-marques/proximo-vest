export const runtime = "nodejs"
import { prisma } from "../../../../lib/prisma"
import { NextRequest } from "next/server"
import { z } from "zod"
import { json, tryCatch } from "../../_utils"
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  filter: z.string().optional(),
})

export const GET = defineRoute({ perm: ["examBoard.read", "examBoard.manage"] }, async (req) => {
  return tryCatch(async () => {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get("filter") || undefined
    const { filter: validatedFilter } = Schema.parse({ filter })

    const data = await prisma.examBoard.findMany({
      where: validatedFilter
        ? {
            OR: [
              { name: { contains: validatedFilter, mode: "insensitive" } },
              { slug: { contains: validatedFilter, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
    })

    return json(data)
  })
});
