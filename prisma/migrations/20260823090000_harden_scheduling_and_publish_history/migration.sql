-- CreateIndex
CREATE UNIQUE INDEX "Schedule_variantId_scheduledFor_key" ON "Schedule"("variantId", "scheduledFor");

-- AlterTable
ALTER TABLE "PublishAttempt" ADD COLUMN "content" TEXT;
ALTER TABLE "PublishAttempt" ADD COLUMN "preview" TEXT;
