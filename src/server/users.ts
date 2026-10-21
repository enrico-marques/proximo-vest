import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { PermissionRequirement } from "@/utils/access-core";

// Read permissions live next to the queries so API routes and pages cannot drift apart.
export const USER_READ = "user.read" satisfies PermissionRequirement;

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  roles: { include: { role: true } },
} satisfies Prisma.UserSelect;

export function listUsers({ filter }: { filter?: string } = {}) {
  return prisma.user.findMany({
    where: filter
      ? {
          OR: [
            { name: { contains: filter, mode: "insensitive" } },
            { id: { contains: filter, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    select: adminUserSelect,
  });
}

export function getUserForAdmin(id: string) {
  return prisma.user.findUnique({ where: { id }, select: adminUserSelect });
}
