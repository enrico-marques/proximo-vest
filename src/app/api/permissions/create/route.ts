import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

const permissionCreateSchema = z.object({
  resource: z.string().min(1, "Resource obrigatório"), // ex: "exam"
  action: z.string().min(1, "Action obrigatória"),     // ex: "publish"
  key: z.string().optional(),                          // ex: "exam.publish"
  isActive: z.boolean().optional(),                    // default true
});

export const POST = defineRoute({ perm: "perm.manage" }, async (req) => {
  try {
    const body = await req.json();
    const values = permissionCreateSchema.parse(body);

    const key = values.key ?? `${values.resource}.${values.action}`;
    const isActive = values.isActive ?? true;

    const exists = await prisma.permission.findUnique({
      where: { key },
    });

    if (exists) {
      return NextResponse.json(
        { error: "Já existe permissão com essa key." },
        { status: 400 }
      );
    }

    const permission = await prisma.permission.create({
      data: {
        resource: values.resource,
        action: values.action,
        key,
        isActive,
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Erro ao criar permissão." },
      { status: 400 }
    );
  }
});
