# How to fix the Region Endpoint Error

This explicit error confirms my exact suspicion from earlier! Your Vercel `.env` region does not match where you actually created your AWS Bucket. 

When your app tries to securely upload the file to `ap-south-1` (or whatever region you set), AWS rejects it with a 301 Redirect saying "Wait, this Bucket is actually located in a different region!"

### **How to fix this in 1 minute:**
1. Log into your **AWS Console** and go to **S3**.
2. Look at your bucket in the list (`campus-connect-uploads`), and explicitly check the **AWS Region** column next to it (e.g., `us-east-1`, `ap-south-1`, `eu-west-2`, etc.).
3. Open your **Vercel Dashboard**.
4. Go to your project -> **Settings** -> **Environment Variables**.
5. Find the `AWS_REGION` variable. Edit it so that it is exactly, character-for-character, the string of the region from AWS (e.g. `us-east-1`).
6. Save it, and **Redeploy** the Vercel project (Settings -> Deployments -> Redeploy).

Once the redeployment finishes, your uploads will work instantly!
