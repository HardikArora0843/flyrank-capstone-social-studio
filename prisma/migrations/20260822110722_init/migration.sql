-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "maxLength" INTEGER NOT NULL,
    "tone" TEXT NOT NULL,
    "maxHashtags" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Variant_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Variant_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "variantId" TEXT NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublishAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "externalMessageId" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" DATETIME,
    CONSTRAINT "PublishAttempt_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishAttempt_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Platform_name_key" ON "Platform"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_adapterKey_key" ON "Platform"("adapterKey");

-- CreateIndex
CREATE INDEX "Variant_postId_idx" ON "Variant"("postId");

-- CreateIndex
CREATE INDEX "Variant_platformId_idx" ON "Variant"("platformId");

-- CreateIndex
CREATE INDEX "Variant_status_idx" ON "Variant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_idempotencyKey_key" ON "Schedule"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Schedule_scheduledFor_idx" ON "Schedule"("scheduledFor");

-- CreateIndex
CREATE INDEX "Schedule_status_scheduledFor_idx" ON "Schedule"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "PublishAttempt_scheduleId_idx" ON "PublishAttempt"("scheduleId");

-- CreateIndex
CREATE INDEX "PublishAttempt_variantId_idx" ON "PublishAttempt"("variantId");

-- CreateIndex
CREATE INDEX "PublishAttempt_idempotencyKey_idx" ON "PublishAttempt"("idempotencyKey");
