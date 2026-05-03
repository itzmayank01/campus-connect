require('dotenv').config({ path: '.env.local' });
const { SESClient, GetIdentityVerificationAttributesCommand } = require("@aws-sdk/client-ses");

async function main() {
  const sesClient = new SESClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.SNS_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SNS_AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const res = await sesClient.send(new GetIdentityVerificationAttributesCommand({ Identities: ["mayankthakur9181@gmail.com"] }));
    console.log("Verification Status:", res.VerificationAttributes);
  } catch(err) {
    console.log("ERROR:", err.name, err.message);
  }
}
main().catch(console.error);
