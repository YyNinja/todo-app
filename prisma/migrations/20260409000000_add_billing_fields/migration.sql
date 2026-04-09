-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('free', 'pro', 'cancelled');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "billingStatus" "BillingStatus" NOT NULL DEFAULT 'free',
ADD COLUMN "stripeCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");
