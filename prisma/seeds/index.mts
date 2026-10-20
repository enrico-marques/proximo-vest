import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { seedPermissions } from "./permissions.mts";
import { seedPlans } from "./plans.mts";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  await seedPermissions(prisma);
  await seedPlans(prisma);
} catch (err) {
  console.error("❌ Erro no seed:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
