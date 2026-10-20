// app/api/admin/users/[userId]/access/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defineRoute } from "@/server/auth/define-route";


export const GET = defineRoute<{ userId: string }>({ perm: "user.read" }, async (_req, context) => {
  const { userId } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      roles: { select: { roleId: true } },
      directPerms: { select: { permissionId: true } }, // sua pivot UserPermission[]
    },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });

  const permissions = await prisma.permission.findMany({
    where: { isActive: true },
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
    },
    roles: roles.map((r) => ({ id: r.id, label: r.name })),
    userRoleIds: user.roles.map((r) => r.roleId),

    // AQUI: blocos de permission
    permissions: permissions.map((p) => ({
      id: p.id,
      // se key estiver vazio, monta a partir de resource + action
      label:
        p.key && p.key.trim().length > 0 ? p.key : `${p.resource}.${p.action}`,
      groupLabel: p.resource, // "exam"
    })),
    userPermissionIds: user.directPerms.map((p) => p.permissionId),
  });
});
