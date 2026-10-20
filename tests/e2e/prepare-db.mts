import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../../src/generated/prisma/client.ts";
import {
  E2E_ADMIN,
  E2E_BOARD_SLUG,
  E2E_EXTRA_BOARDS,
  E2E_OTHER_TEACHER,
  E2E_TEACHER,
  E2E_USER,
} from "./fixtures.ts";

type SeedUser = { name: string; email: string; password: string };

async function createUser(prisma: PrismaClient, user: SeedUser, roleId?: string) {
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      status: "active",
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(user.password),
        },
      },
      ...(roleId ? { roles: { create: { roleId } } } : {}),
    },
  });
  return id;
}

// Runs as the first step of the e2e web server command, so the database is ready before the
// app opens its connection pool. Run by Node directly: node tests/e2e/prepare-db.mts
async function prepareDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const env = { ...process.env, DATABASE_URL: databaseUrl };

  execSync("npx prisma migrate deploy", { env, stdio: "inherit" });
  execSync("npm run db:seed", { env, stdio: "inherit" });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    // Recreated on every run so tests never depend on leftovers. Cascades remove
    // sessions, accounts, role links, teacher lists and the board's questions.
    const users = [E2E_USER, E2E_TEACHER, E2E_OTHER_TEACHER, E2E_ADMIN];
    await prisma.user.deleteMany({ where: { email: { in: users.map((u) => u.email) } } });
    // Rate-limit counters survive between runs; start every run with a clean slate.
    await prisma.rateLimit.deleteMany();
    await prisma.examBoard.deleteMany({ where: { slug: { startsWith: E2E_BOARD_SLUG } } });

    const professor = await prisma.role.findFirstOrThrow({
      where: { name: { equals: "Professor", mode: "insensitive" } },
    });

    await createUser(prisma, E2E_USER);
    const teacherId = await createUser(prisma, E2E_TEACHER, professor.id);
    const otherTeacherId = await createUser(prisma, E2E_OTHER_TEACHER, professor.id);

    const adminId = await createUser(prisma, E2E_ADMIN);
    const adminPerms = await prisma.permission.findMany({ where: { key: { in: E2E_ADMIN.permissions } } });
    await prisma.userPermission.createMany({
      data: adminPerms.map((p) => ({ userId: adminId, permissionId: p.id, granted: true })),
    });

    await prisma.examBoard.createMany({
      data: Array.from({ length: E2E_EXTRA_BOARDS }, (_, i) => {
        const n = String(i + 1).padStart(2, "0");
        return { slug: `${E2E_BOARD_SLUG}-${n}`, name: `Banca E2E ${n}` };
      }),
    });

    const question = await prisma.question.create({
      data: {
        numberLabel: "1",
        status: "PUBLISHED",
        phase: {
          create: {
            phaseNumber: 1,
            edition: {
              create: {
                year: 2025,
                editionLabel: "2025",
                board: { create: { slug: E2E_BOARD_SLUG, name: "Banca E2E" } },
              },
            },
          },
        },
        stimulus: { create: { contentHtml: "Quanto é $2 + 2$? Considere a soma usual." } },
        mcq: {
          create: {
            optionCount: 4,
            correctOptionKey: "B",
            options: {
              create: [
                { label: "A", textHtml: "3" },
                { label: "B", textHtml: "4" },
                { label: "C", textHtml: "5" },
                { label: "D", textHtml: "22" },
              ],
            },
          },
        },
      },
    });

    for (const [id, owner, name] of [
      [E2E_TEACHER.listId, teacherId, E2E_TEACHER.name],
      [E2E_OTHER_TEACHER.listId, otherTeacherId, E2E_OTHER_TEACHER.name],
    ] as const) {
      await prisma.teacherList.create({
        data: {
          id,
          name: `Lista ${name}`,
          teacherId: owner,
          teacherName: name,
          questions: { create: { questionId: question.id, order: 1 } },
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

await prepareDatabase();
