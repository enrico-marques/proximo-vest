import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

const BodySchema = z.object({
  roleIds: z.array(z.string()).min(0),
});


export const GET = defineRoute<{ userId: string }>({ perm: "user.read" }, async (req, context) => {
  try {
    const { userId } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: { message: "Usuário não encontrado." } },
        { status: 404 }
      );
    }

    const allRoles = await prisma.role.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      roles: user.roles.map((ur) => ur.roleId),
      allRoles,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
});

export const PUT = defineRoute<{ userId: string }>({ perm: "user.update" }, async (req, context) => {
  try {
    const { userId } = await context.params;

    const body = await req.json();
    const { roleIds } = BodySchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json(
        { error: { message: "Usuário não encontrado." } },
        { status: 404 }
      );
    }

    await prisma.userRole.deleteMany({
      where: { userId },
    });

    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    }

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
});
