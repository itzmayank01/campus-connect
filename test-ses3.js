require('dotenv').config({ path: '.env.local' });
const { SESClient, VerifyEmailIdentityCommand } = require("@aws-sdk/client-ses");

async function main() {
  const sesClient = new SESClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.SNS_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SNS_AWS_SECRET_ACCESS_KEY,
    },
  });

  const targetEmail = "mayankthakur9181@gmail.com";
  console.log("Verifying Target:", targetEmail);

  try {
    const vRes = await sesClient.send(new VerifyEmailIdentityCommand({ EmailAddress: targetEmail }));
    console.log("Verify SUCCESS:", vRes);
  } catch(vErr) {
    console.log("Verify ERROR:", vErr.name, vErr.message);
  }
}
main().catch(console.error);
