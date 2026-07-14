-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "receiptGroupId" TEXT;

-- CreateIndex
CREATE INDEX "transactions_userId_receiptGroupId_idx" ON "transactions"("userId", "receiptGroupId");
