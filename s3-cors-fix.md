# How to Fix S3 "Failed to fetch" CORS issue

The "Failed to fetch" error happens because your AWS S3 Bucket requires explicit permission (CORS) to accept direct uploads from your Vercel URL.

**To fix this immediately:**
1. Log into your **AWS Console** and go to **S3**.
2. Click on your bucket: `campus-connect-uploads`
3. Go to the **Permissions** tab.
4. Scroll down to **Cross-origin resource sharing (CORS)** and click **Edit**.
5. Paste this exactly into the box and click **Save**:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

*Note: The `["*"]` for AllowedOrigins allows both localhost and your Vercel URL. Once you do this, your file uploads will start succeeding instantly!*
