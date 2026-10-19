// app/api/admin/users/[userId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";


// Ajusta os valores do enum conforme seu modelo Prisma
const UpdateUserSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
});
export const PUT = defineRoute<{ userId: string }>({ perm: "user.update" }, async (req, context) => {
  const { userId } = await context.params;

  const json = await req.json();

  const parseResult = UpdateUserSchema.safeParse(json);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Dados inválidos",
        issues: parseResult.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { name, email, status } = parseResult.data;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      status,
    },
  });

  return NextResponse.json({ ok: true });
});
