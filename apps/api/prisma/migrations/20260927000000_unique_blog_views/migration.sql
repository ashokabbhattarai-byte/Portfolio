BEGIN;
-- Block collection during the backfill so no first-view claim can be missed.
LOCK TABLE page_views, blogs IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE "blog_views" (
  "blogId" TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blog_views_pkey" PRIMARY KEY ("blogId", "visitorHash"),
  CONSTRAINT "blog_views_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blogs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "blog_views_createdAt_idx" ON "blog_views"("createdAt");
-- Only the current browser identities are comparable. Preserve all raw visits.
INSERT INTO "blog_views" ("blogId", "visitorHash", "createdAt")
SELECT "blogId", "ipHash", MIN("createdAt") FROM "page_views"
WHERE "blogId" IS NOT NULL AND "ipHash" LIKE 'v2:%'
GROUP BY "blogId", "ipHash";
UPDATE "blogs" b SET "viewCount" = (SELECT COUNT(*) FROM "blog_views" v WHERE v."blogId" = b.id);
COMMIT;
