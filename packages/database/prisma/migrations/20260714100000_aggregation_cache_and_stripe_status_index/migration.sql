-- CreateTable
CREATE TABLE "user_period_aggregations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "primaryCurrency" "Currency" NOT NULL,
    "totalSpentPrimary" DECIMAL(14,2) NOT NULL,
    "totalSpentRaw" DECIMAL(14,2) NOT NULL,
    "fixedCostsTotal" DECIMAL(14,2) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "categoryTotalsPrimary" JSONB NOT NULL,
    "categoryTotalsRaw" JSONB NOT NULL,
    "isDirty" BOOLEAN NOT NULL DEFAULT true,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_period_aggregations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_period_aggregations_userId_periodStart_key" ON "user_period_aggregations"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "user_period_aggregations_userId_isDirty_idx" ON "user_period_aggregations"("userId", "isDirty");

-- CreateIndex
CREATE INDEX "user_period_aggregations_isDirty_computedAt_idx" ON "user_period_aggregations"("isDirty", "computedAt");

-- CreateIndex
CREATE INDEX "processed_stripe_events_status_idx" ON "processed_stripe_events"("status");

-- AddForeignKey
ALTER TABLE "user_period_aggregations" ADD CONSTRAINT "user_period_aggregations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
