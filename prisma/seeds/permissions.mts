import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const permissions = [
  { resource: "billing", action: "manage" },

  { resource: "coupon", action: "manage" },
  { resource: "coupon", action: "read" },

  { resource: "crm", action: "read" },

  { resource: "examBoard", action: "manage" },
  { resource: "examBoard", action: "read" },

  { resource: "examEdition", action: "manage" },
  { resource: "examEdition", action: "read" },

  { resource: "examPhase", action: "manage" },
  { resource: "examPhase", action: "read" },

  { resource: "expectedAnswer", action: "manage" },
  { resource: "expectedAnswer", action: "read" },

  { resource: "finance", action: "read" },

  { resource: "perm", action: "manage" },
  { resource: "perm", action: "read" },

  { resource: "plan", action: "manage" },
  { resource: "plan", action: "read" },

  { resource: "profile", action: "update" },

  { resource: "question", action: "batch" },
  { resource: "question", action: "create" },
  { resource: "question", action: "delete" },
  { resource: "question", action: "read" },
  { resource: "question", action: "update" },

  { resource: "role", action: "manage" },
  { resource: "role", action: "read" },

  { resource: "rubric", action: "manage" },
  { resource: "rubric", action: "read" },

  { resource: "session", action: "read" },
  { resource: "session", action: "revoke" },

  { resource: "skill", action: "manage" },
  { resource: "skill", action: "read" },

  { resource: "subject", action: "manage" },
  { resource: "subject", action: "read" },

  { resource: "subscription", action: "manage" },
  { resource: "subscription", action: "read" },

  { resource: "teacherList", action: "manage" },

  { resource: "user", action: "access.update" },
  { resource: "user", action: "create" },
  { resource: "user", action: "delete" },
  { resource: "user", action: "read" },
  { resource: "user", action: "update" }
];

// Grants applied on top of whatever was configured through the admin UI; never revokes.
const roleGrants: Record<string, string[]> = {
  Admin: ["plan.manage", "subscription.manage", "coupon.manage"],
  Professor: ["teacherList.manage"],
};

async function findOrCreateRole(name: string) {
  // Role names were typed by hand in the admin UI, so match case-insensitively.
  const existing = await prisma.role.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  return existing ?? prisma.role.create({ data: { name } });
}

async function grantRolePermissions() {
  for (const [roleName, keys] of Object.entries(roleGrants)) {
    const role = await findOrCreateRole(roleName);
    const perms = await prisma.permission.findMany({ where: { key: { in: keys } } });

    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: { granted: true },
        create: { roleId: role.id, permissionId: perm.id, granted: true },
      });
    }
    console.log(`🔐 ${role.name}: ${keys.join(", ")}`);
  }
}

async function main() {
  console.log("🌱 Iniciando seed de permissões...");

  for (const p of permissions) {
    const key = `${p.resource}.${p.action}`;

    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        resource: p.resource,
        action: p.action,
        key
      }
    });
  }

  await grantRolePermissions();

  console.log("✅ Permissões atualizadas/criadas com sucesso!");
}

main()
  .catch((err) => {
    console.error("❌ Erro no seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
