import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client.ts";

// Bootstraps an administrator on a fresh database: gives the Admin role every permission,
// assigns it to an existing user and marks their e-mail as verified (local setups usually
// have no e-mail provider). Usage: npm run admin:grant -- pessoa@exemplo.com
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Uso: npm run admin:grant -- pessoa@exemplo.com");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Nenhum usuário com o e-mail ${email}. Cadastre-se no app primeiro.`);
  }

  const role =
    (await prisma.role.findFirst({ where: { name: { equals: "Admin", mode: "insensitive" } } })) ??
    (await prisma.role.create({ data: { name: "Admin" } }));

  const permissions = await prisma.permission.findMany({ select: { id: true } });
  if (permissions.length === 0) throw new Error("Nenhuma permissão cadastrada. Rode npm run db:seed antes.");

  await prisma.$transaction([
    ...permissions.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: { granted: true },
        create: { roleId: role.id, permissionId: p.id, granted: true },
      }),
    ),
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    }),
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
  ]);

  console.log(`✅ ${email} agora é ${role.name}, com ${permissions.length} permissões.`);
} catch (err) {
  console.error(`❌ ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
