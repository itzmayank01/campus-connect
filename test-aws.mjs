/**
 * @file test-aws.mjs
 * @description Quick test to verify both S3 and Textract are accessible
 * with the current .env credentials. Run: node test-aws.mjs
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  TextractClient,
  DetectDocumentTextCommand,
} from "@aws-sdk/client-textract";
import { config } from "dotenv";

config(); // load .env

const region    = process.env.AWS_REGION;
const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket    = process.env.AWS_S3_BUCKET;

console.log("═══ AWS Connection Test ═══");
console.log(`Region:  ${region}`);
console.log(`Bucket:  ${bucket}`);
console.log(`Key ID:  ${accessKey?.slice(0, 8)}...`);
console.log("");

if (!region || !accessKey || !secretKey || !bucket) {
  console.error("❌ Missing required env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET");
  process.exit(1);
}

const creds = {
  accessKeyId:     accessKey,
  secretAccessKey: secretKey,
};

const s3 = new S3Client({ region, credentials: creds });
const textract = new TextractClient({ region, credentials: creds });

// ── Test S3 ───────────────────────────────────────────────────────────────────
try {
  const testKey = "test/connection-test.txt";
  await s3.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         testKey,
    Body:        Buffer.from(`Campus Connect AWS test — ${new Date().toISOString()}`),
    ContentType: "text/plain",
  }));
  console.log("✅ S3 write: SUCCESS");

  // Clean up test file
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
  console.log("✅ S3 delete: SUCCESS (test file cleaned up)");
} catch (e) {
  console.error("❌ S3 FAILED:", e.message);
  process.exit(1);
}

// ── Test Textract ─────────────────────────────────────────────────────────────
try {
  // Send a minimal byte payload — will fail on document parsing but confirms IAM permissions
  await textract.send(new DetectDocumentTextCommand({
    Document: { Bytes: Buffer.from("fake") },
  }));
  console.log("✅ Textract detect: SUCCESS");
} catch (e) {
  const permissionErrors = ["AccessDeniedException", "UnrecognizedClientException"];
  if (permissionErrors.includes(e.name)) {
    console.error(`❌ Textract FAILED: ${e.name} — check IAM policy includes Textract permissions`);
    process.exit(1);
  }
  // Other errors (InvalidParameterException, UnsupportedDocumentException) mean
  // IAM permissions are fine, the fake document just isn't valid
  console.log(`✅ Textract access: SUCCESS (IAM permissions confirmed, expected error: ${e.name})`);
}

console.log("\n═══════════════════════════");
console.log("✅ AWS setup complete. Both S3 and Textract are accessible.");
console.log("═══════════════════════════");
