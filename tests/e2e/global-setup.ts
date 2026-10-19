import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../../src/generated/prisma/client";
import { E2E_USER } from "./fixtures";

export default async function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL!;

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    // Recreated on every run so tests never depend on leftovers (sessions, status changes).
    await prisma.user.deleteMany({ where: { email: E2E_USER.email } });

    const userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        name: E2E_USER.name,
        email: E2E_USER.email,
        emailVerified: true,
        status: "active",
        accounts: {
          create: {
            id: randomUUID(),
            accountId: userId,
            providerId: "credential",
            password: await hashPassword(E2E_USER.password),
          },
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
