provider "aws" {
  region = "ap-south-1" 
}

resource "aws_sns_topic" "exam_notifications" {
  name = "campus-connect-exam-notifications"
}

resource "aws_iam_user" "sns_publisher" {
  name = "campus-connect-sns-publisher"
}

resource "aws_iam_access_key" "sns_publisher_keys" {
  user = aws_iam_user.sns_publisher.name
}

resource "aws_iam_user_policy" "sns_publish_policy" {
  name = "allow-sns-publish"
  user = aws_iam_user.sns_publisher.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = "sns:Publish"
        Effect   = "Allow"
        Resource = aws_sns_topic.exam_notifications.arn
      },
    ]
  })
}

resource "aws_iam_user_policy" "ses_publish_policy" {
  name = "allow-ses-publish"
  user = aws_iam_user.sns_publisher.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:VerifyEmailIdentity"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
    ]
  })
}

# ─── Textract Infrastructure ────────────────────────────────────────────────
# S3 bucket for Textract temp files (async PDF OCR needs S3 access)
resource "aws_s3_bucket" "textract_temp" {
  bucket = "campus-connect-textract-temp"
}

resource "aws_s3_bucket_lifecycle_configuration" "textract_temp_lifecycle" {
  bucket = aws_s3_bucket.textract_temp.id

  rule {
    id     = "auto-delete-temp-files"
    status = "Enabled"

    expiration {
      days = 1
    }
  }
}

# Textract permissions for the existing IAM user
resource "aws_iam_user_policy" "textract_policy" {
  name = "allow-textract"
  user = aws_iam_user.sns_publisher.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "textract:AnalyzeDocument",
          "textract:StartDocumentTextDetection",
          "textract:GetDocumentTextDetection"
        ]
        Resource = "*"
      },
    ]
  })
}

# S3 access for the Textract temp bucket
resource "aws_iam_user_policy" "textract_s3_policy" {
  name = "allow-textract-s3"
  user = aws_iam_user.sns_publisher.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.textract_temp.arn}/*"
      },
    ]
  })
}

output "AWS_REGION" {
  value = "ap-south-1"
}

output "AWS_SNS_TOPIC_ARN" {
  value = aws_sns_topic.exam_notifications.arn
}

output "AWS_ACCESS_KEY_ID" {
  value = aws_iam_access_key.sns_publisher_keys.id
}

output "AWS_SECRET_ACCESS_KEY" {
  value     = aws_iam_access_key.sns_publisher_keys.secret
  sensitive = true
}

output "TEXTRACT_S3_BUCKET" {
  value = aws_s3_bucket.textract_temp.id
}
