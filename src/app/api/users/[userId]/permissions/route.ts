import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

// Body do PUT
const BodySchema = z.object({
  permissionIds: z.array(z.string()).min(0),
});



// -------- GET: retorna permissões que o usuário tem diretamente + lista completa --------
export const GET = defineRoute<{ userId: string }>({ perm: "user.read" }, async (req, context) => {
  const { userId } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      directPerms: {
        include: {
          permission: true,
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

  const allPermissions = await prisma.permission.findMany({
    where: { isActive: true },
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });

  const grantedIds = user.directPerms
    .filter((up) => up.granted)
    .map((up) => up.permissionId);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    permissionIds: grantedIds,
    allPermissions,
  });
});

// -------- PUT: atualiza overrides diretos (UserPermission) --------
export const PUT = defineRoute<{ userId: string }>({ perm: "user.access.update" }, async (req, context) => {
  const { userId } = await context.params;

  const body = await req.json();
  const { permissionIds } = BodySchema.parse(body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json(
      { error: { message: "Usuário não encontrado." } },
      { status: 404 }
    );
  }

  // Estratégia simples: limpa overrides e recria apenas os "granted"
  await prisma.userPermission.deleteMany({
    where: { userId },
  });

  if (permissionIds.length > 0) {
    await prisma.userPermission.createMany({
      data: permissionIds.map((permissionId) => ({
        userId,
        permissionId,
        granted: true,
      })),
    });
  }

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      directPerms: {
        include: { permission: true },
      },
    },
  });

  return NextResponse.json(updated);
});
