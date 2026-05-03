require('dotenv').config({ path: '.env.local' });
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

async function main() {
  const sesClient = new SESClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.SNS_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.SNS_AWS_SECRET_ACCESS_KEY,
    },
  });

  const senderEmail = process.env.AWS_SES_SENDER_EMAIL;
  try {
    const command = new SendEmailCommand({
      Source: senderEmail,
      Destination: { ToAddresses: ["mayankthakur9181@gmail.com"] },
      Message: { Subject: { Data: "Test Mail" }, Body: { Text: { Data: "Test Body" } } },
    });
    const res = await sesClient.send(command);
    console.log("SUCCESS:", res);
  } catch (err) {
    console.log("ERROR NAME:", err.name);
    console.log("ERROR MESSAGE:", err.message);
  }
}
main().catch(console.error);
