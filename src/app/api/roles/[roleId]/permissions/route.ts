import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { defineRoute } from "@/server/auth/define-route";

const bodySchema = z.object({
  permissionIds: z.array(z.string()).min(0),
});


export const GET = defineRoute<{ roleId: string }>({ perm: "role.manage" }, async (req, context) => {
  const { roleId } = await context.params;

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      perms: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!role) {
    return NextResponse.json(
      { error: { message: "Role não encontrada." } },
      { status: 404 }
    );
  }

  const permissions = role.perms.map((rp) => ({
    roleId: rp.roleId,
    permissionId: rp.permissionId,
    granted: rp.granted,
    permission: rp.permission,
  }));

  return NextResponse.json({
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
    },
    permissions,
  });
});

export const PUT = defineRoute<{ roleId: string }>({ perm: "role.manage" }, async (req, context) => {
  const { roleId } = await context.params;

  const body = await req.json();
  const { permissionIds } = bodySchema.parse(body);

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json(
      { error: { message: "Role não encontrada." } },
      { status: 404 }
    );
  }

  const existing = await prisma.rolePermission.findMany({
    where: { roleId },
  });

  const incomingSet = new Set(permissionIds);

  const toGrant = permissionIds;

  const toRevoke = existing
    .filter((rp) => !incomingSet.has(rp.permissionId))
    .map((rp) => rp.permissionId);

  await Promise.all(
    toGrant.map((permissionId) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
        create: {
          roleId,
          permissionId,
          granted: true,
        },
        update: {
          granted: true,
        },
      })
    )
  );

  if (toRevoke.length > 0) {
    await prisma.rolePermission.updateMany({
      where: {
        roleId,
        permissionId: { in: toRevoke },
      },
      data: { granted: false },
    });
  }

  const updated = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      perms: {
        include: { permission: true },
      },
    },
  });

  return NextResponse.json(updated);
});
