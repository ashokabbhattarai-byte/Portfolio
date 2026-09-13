CREATE TABLE "blog_likes" (
  "blogId" TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_likes_pkey" PRIMARY KEY ("blogId", "visitorHash"),
  CONSTRAINT "blog_likes_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "blog_likes_createdAt_idx" ON "blog_likes"("createdAt");
CREATE INDEX "page_views_ipHash_createdAt_idx" ON "page_views"("ipHash", "createdAt");
CREATE INDEX "page_views_createdAt_idx" ON "page_views"("createdAt");
