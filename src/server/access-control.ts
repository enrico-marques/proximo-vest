import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { PermissionRequirement } from "@/utils/access-core";

// Read permissions live next to the queries so API routes and pages cannot drift apart.
export const PERMISSION_READ = ["perm.read", "perm.manage", "role.manage"] as const satisfies PermissionRequirement;
export const ROLE_READ = ["role.read", "role.manage"] as const satisfies PermissionRequirement;

export function listPermissions({ onlyActive, resource }: { onlyActive?: boolean; resource?: string } = {}) {
  const where: Prisma.PermissionWhereInput = {};
  if (onlyActive) where.isActive = true;
  if (resource) where.resource = resource;

  return prisma.permission.findMany({
    where,
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });
}

export function listRoles({ isActive }: { isActive?: boolean } = {}) {
  const where: Prisma.RoleWhereInput = {};
  if (isActive !== undefined) where.isActive = isActive;

  return prisma.role.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
  });
}
