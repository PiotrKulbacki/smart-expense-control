-- CreateTable
CREATE TABLE "user_category_limits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "limitAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_category_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_category_limits_userId_idx" ON "user_category_limits"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_category_limits_userId_categoryKey_key" ON "user_category_limits"("userId", "categoryKey");

-- AddForeignKey
ALTER TABLE "user_category_limits" ADD CONSTRAINT "user_category_limits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
