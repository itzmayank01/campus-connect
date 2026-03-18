import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Initialize the S3 client — reads from environment variables
export const s3Client = new S3Client({
  region: (process.env.AWS_REGION || "ap-south-1").toLowerCase().replace(/\s+/g, '-'),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

export const S3_BUCKET = process.env.AWS_S3_BUCKET || "campus-connect-uploads"

/**
 * Generate a presigned PUT URL for uploading a file directly from the browser.
 * The URL is valid for 10 minutes.
 */
export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn: 600 })
  return url
}

/**
 * Generate a presigned GET URL for downloading/viewing a file.
 * The URL is valid for 1 hour.
 */
export async function getPresignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  return url
}

/**
 * Build the S3 object key for a file upload.
 * Format: uploads/{userId}/{semesterId}/{subjectId}/{timestamp}_{filename}
 */
export function buildS3Key(userId: string, subjectId: string, filename: string) {
  const timestamp = Date.now()
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  return `uploads/${userId}/${subjectId}/${timestamp}_${sanitized}`
}

/**
 * Delete an object from S3 by its key.
 */
export async function deleteS3Object(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  })
  await s3Client.send(command)
}
