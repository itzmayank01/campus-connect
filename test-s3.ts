require("dotenv").config({ path: ".env.local" });
const { prisma } = require("./lib/prisma");

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { extractTextFromBuffer } = require("./lib/pdf-extractor");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function run() {
  const resource = await prisma.resource.findFirst({
    where: { originalFilename: { contains: "Syllabus_" } }
  });
  if (!resource) {
    console.log("No resource found.");
    return;
  }
  
  console.log("Found:", resource.originalFilename, resource.s3Key);
  
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: resource.s3Key
    }));
    
    const bodyBytes = await response.Body?.transformToByteArray();
    if (bodyBytes) {
      const buffer = Buffer.from(bodyBytes);
      console.log("Buffer length:", buffer.length);
      console.log("Magic bytes:", buffer[0].toString(16), buffer[1].toString(16));
      
      const text = await extractTextFromBuffer(buffer, resource.originalFilename, resource.mimeType);
      console.log("Text extracted:", text.slice(0, 100));
    }
  } catch(err) {
    console.error("FAIL", err);
  }
}
run();
