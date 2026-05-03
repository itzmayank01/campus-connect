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

  const targetEmail = "mayankthakur9181@gmail.com";

  try {
    const command = new SendEmailCommand({
      Source: targetEmail,
      Destination: { ToAddresses: [targetEmail] },
      Message: { Subject: { Data: "Test Mail from Campus Connect" }, Body: { Text: { Data: "This proves it works!" } } },
    });
    const res = await sesClient.send(command);
    console.log("SendEmail SUCCESS:", res.MessageId);
  } catch (err) {
    console.log("SendEmail ERROR NAME:", err.name);
    console.log("SendEmail ERROR MESSAGE:", err.message);
  }
}
main().catch(console.error);
