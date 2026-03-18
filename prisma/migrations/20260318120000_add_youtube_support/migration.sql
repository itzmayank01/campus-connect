-- AlterTable
ALTER TABLE "resources" ALTER COLUMN "s3_key" DROP NOT NULL;
ALTER TABLE "resources" ALTER COLUMN "file_size" SET DEFAULT 0;

-- Add YouTube columns
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "resource_url" TEXT;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "resource_url_type" TEXT;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "youtube_video_id" TEXT;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "youtube_playlist_id" TEXT;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "youtube_thumbnail" TEXT;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "youtube_title" TEXT;
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "youtube_channel" TEXT;
