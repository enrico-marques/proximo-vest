import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { z } from "zod"
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  filter: z.string().optional(),
})

export const GET = defineRoute({ perm: ["subject.read", "subject.manage"] }, async (req) => {
  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get("filter") || undefined

    const { filter: validatedFilter } = Schema.parse({ filter })

    const rows = await prisma.subject.findMany({
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

    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: 400 })
  }
});
