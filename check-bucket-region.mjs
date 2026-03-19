import { S3Client, GetBucketLocationCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ region: "us-east-1" }); // Global lookup region
async function check() {
  const command = new GetBucketLocationCommand({ Bucket: "campus-connect-uploads" });
  try {
    const response = await client.send(command);
    console.log("ACTUAL BUCKET REGION:", response.LocationConstraint || "us-east-1");
  } catch (error) {
    console.error("ERROR:", error.message);
  }
}
check();
