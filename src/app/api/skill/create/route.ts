import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

const Schema = z.object({
  code: z.string().nullable().optional(),
  label: z.string()
});

export const POST = defineRoute({ perm: "skill.manage" }, async (req) => {
  const data = Schema.parse(await req.json());
  const created = await prisma.skill.create({ data });
  return NextResponse.json(created, { status: 201 });
});
