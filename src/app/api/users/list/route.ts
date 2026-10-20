export const runtime = "nodejs"
import { prisma } from "../../../../lib/prisma"
import { NextRequest } from "next/server"
import { z } from "zod"
import { json } from "../../_utils"
import { defineRoute } from "@/server/auth/define-route";
const Schema = z.object({
  filter: z.string().optional(),
})

export const GET = defineRoute({ perm: "user.read" }, async (req) => {
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get("filter") || undefined
  const { filter: validatedFilter } = Schema.parse({ filter })

  const data = await prisma.user.findMany({
    where: validatedFilter
      ? {
        OR: [
          { name: { contains: validatedFilter, mode: "insensitive" } },
          { id: { contains: validatedFilter, mode: "insensitive" } },
        ],
      }
      : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      roles: {
        include: { role: true },
      }
    },

  })

  return json(data)
});
