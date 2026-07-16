-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'PREMIUM';

-- AlterTable users
ALTER TABLE "users" ADD COLUMN "pastDueFirstEmailSentAt" TIMESTAMP(3),
ADD COLUMN "pastDueReminderSentAt" TIMESTAMP(3),
ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable transactions
ALTER TABLE "transactions" ADD COLUMN "imageExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_lastActiveAt_idx" ON "users"("lastActiveAt");

-- CreateIndex
CREATE INDEX "users_pastDueSince_idx" ON "users"("pastDueSince");

-- CreateIndex
CREATE INDEX "transactions_imageExpiresAt_idx" ON "transactions"("imageExpiresAt");
