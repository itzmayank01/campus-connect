-- Campus Connect: Cleanup old broken S3 references
-- Old AWS account is dead. All s3Keys point to inaccessible files.
-- Must delete in correct order due to foreign key constraints.

-- Step 1: Delete resource verifications (references resources)
DELETE FROM "resource_verifications";

-- Step 2: Delete resource likes (references resources)
DELETE FROM "resource_likes";

-- Step 3: Delete resource downloads (references resources)
DELETE FROM "resource_downloads";

-- Step 4: Delete rating replies (references resource_ratings)
DELETE FROM "rating_replies";

-- Step 5: Delete resource ratings (references resources)
DELETE FROM "resource_ratings";

-- Step 6: Delete all StudyTool records (derived from resources, safe to delete)
DELETE FROM "study_tools";

-- Step 7: Delete all Resource records (broken S3 references)
DELETE FROM "resources";

-- Step 8: Verify cleanup
SELECT COUNT(*) as remaining_resources FROM "resources";
SELECT COUNT(*) as remaining_tools FROM "study_tools";
-- Both should be 0
