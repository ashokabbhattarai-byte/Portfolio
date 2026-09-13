-- CreateEnum
CREATE TYPE "BlogImagePlacement" AS ENUM ('COVER', 'HERO', 'INLINE', 'GALLERY', 'THUMBNAIL');

-- CreateTable
CREATE TABLE "blog_images" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "caption" TEXT,
    "placement" "BlogImagePlacement" NOT NULL DEFAULT 'INLINE',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_images_blogId_placement_position_idx" ON "blog_images"("blogId", "placement", "position");

-- CreateIndex
CREATE INDEX "blog_images_blogId_position_idx" ON "blog_images"("blogId", "position");

-- AddForeignKey
ALTER TABLE "blog_images" ADD CONSTRAINT "blog_images_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
