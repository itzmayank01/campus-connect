require('dotenv').config({ path: '.env.local' });
const { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } = require("@aws-sdk/client-ses");

async function main() {
  const sesClient = new SESClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const senderEmail = process.env.AWS_SES_SENDER_EMAIL;
  const targetEmail = "mayankthakur9181@gmail.com";
  console.log("Sender:", senderEmail);
  console.log("Target:", targetEmail);

  try {
    const command = new SendEmailCommand({
      Source: senderEmail,
      Destination: { ToAddresses: [targetEmail] },
      Message: {
        Subject: { Data: "Test Mail" },
        Body: { Text: { Data: "Test Body" } },
      },
    });
    const res = await sesClient.send(command);
    console.log("SendEmail SUCCESS:", res);
  } catch (err) {
    console.log("SendEmail ERROR NAME:", err.name);
    console.log("SendEmail ERROR MESSAGE:", err.message);
    
    if (err.name === 'MessageRejected' || err.message.includes('not verified') || err.message.includes('Sandbox') || err.message.includes('Unverified')) {
        console.log("Triggering auto-verify...");
        try {
            const vRes = await sesClient.send(new VerifyEmailIdentityCommand({ EmailAddress: targetEmail }));
            console.log("Verify SUCCESS:", vRes);
        } catch(vErr) {
            console.log("Verify ERROR:", vErr.message);
        }
    }
  }
}
main().catch(console.error);
