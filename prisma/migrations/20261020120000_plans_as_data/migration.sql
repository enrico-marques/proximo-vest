-- Plans become pure data: subscriptions point at Plan.id, limits live in Plan columns,
-- and usage is metered per user. Existing rows are carried over.

-- Enums. The old SubscriptionStatus type was never used by a column (status was TEXT),
-- so it is recreated with the full set of values.
DROP TYPE "SubscriptionStatus";
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCEL_AT_PERIOD_END', 'CANCELED', 'EXPIRED');
CREATE TYPE "PlanAudience" AS ENUM ('STUDENT', 'TEACHER', 'SCHOOL');
CREATE TYPE "UsageMetric" AS ENUM ('ESSAY_CORRECTION', 'TEACHER_LIST', 'QUESTION_ANSWER');
DROP TYPE "SubscriptionType";
DROP TYPE "SubscriptionName";

-- Plan
ALTER TABLE "Plan"
ADD COLUMN "audience" "PlanAudience",
ADD COLUMN "essayCreditsPerMonth" INTEGER,
ADD COLUMN "listsPerMonth" INTEGER,
ADD COLUMN "questionsPerDay" INTEGER,
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "Plan" SET "audience" = CASE lower("type")
  WHEN 'teacher' THEN 'TEACHER'::"PlanAudience"
  WHEN 'school' THEN 'SCHOOL'::"PlanAudience"
  ELSE 'STUDENT'::"PlanAudience"
END;

-- Limits default to "not included" so carried-over plans grant nothing until an admin sets them.
UPDATE "Plan" SET "essayCreditsPerMonth" = 0, "listsPerMonth" = 0, "questionsPerDay" = 0;

ALTER TABLE "Plan" ALTER COLUMN "audience" SET NOT NULL;

-- Subscription: planKey -> planId
ALTER TABLE "Subscription" ADD COLUMN "planId" TEXT;
UPDATE "Subscription" s SET "planId" = p."id" FROM "Plan" p WHERE p."key" = s."planKey";
-- Subscriptions whose planKey matched no plan (e.g. the old "unknown" placeholder) cannot be kept.
DELETE FROM "Subscription" WHERE "planId" IS NULL;
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planKey_fkey";
ALTER TABLE "Subscription" DROP COLUMN "planKey";
ALTER TABLE "Subscription" ALTER COLUMN "planId" SET NOT NULL;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Subscription.status: TEXT -> enum (unknown values become EXPIRED)
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus" USING (
  CASE WHEN "status" IN ('ACTIVE', 'CANCEL_AT_PERIOD_END', 'CANCELED', 'EXPIRED')
    THEN "status"::"SubscriptionStatus"
    ELSE 'EXPIRED'::"SubscriptionStatus"
  END
);

DROP INDEX "Plan_key_key";
ALTER TABLE "Plan" DROP COLUMN "key", DROP COLUMN "type";

CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");
CREATE UNIQUE INDEX "Plan_stripeYearlyPriceId_key" ON "Plan"("stripeYearlyPriceId");
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");


-- UsageCounter
CREATE TABLE "UsageCounter" (
    "userId" TEXT NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("userId","metric","period")
);

ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
