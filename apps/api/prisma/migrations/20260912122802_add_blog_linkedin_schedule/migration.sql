-- CreateEnum
CREATE TYPE "BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "blogs" ADD COLUMN     "linkedinPostId" TEXT,
ADD COLUMN     "linkedinStatus" TEXT DEFAULT 'idle',
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "status" "BlogStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "blogs_status_scheduledAt_idx" ON "blogs"("status", "scheduledAt");
