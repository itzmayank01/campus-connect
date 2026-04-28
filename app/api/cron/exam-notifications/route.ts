import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    // Find exams happening exactly between 24 and 25 hours from now
    const tomorrowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    const exams = await (prisma as any).exam.findMany({
      where: {
        date: {
          gte: tomorrowStart,
          lt: tomorrowEnd,
        },
      },
      include: {
        subject: true,
        semester: true,
      },
    })

    if (exams.length === 0) {
      return NextResponse.json({ message: "No exams scheduled for tomorrow." })
    }

    let notificationsSent = 0

    for (const exam of exams) {
      // Find users in this semester
      const users = await prisma.user.findMany({
        where: { semester: exam.semester.number },
        select: { email: true, name: true },
      })

      const examTime = exam.date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      const examDate = exam.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

      const message = `Reminder: You have an upcoming ${exam.type} for ${exam.subject?.name || "your subject"} on ${examDate} at ${examTime}. Good luck!`

      // Send to all users
      for (const user of users) {
        if (!user.email) continue

        // Here we're using AWS SNS Direct Publish to Email endpoints.
        // In a real production environment, you might publish to a Topic instead,
        // but for this implementation we simulate publishing to the user directly
        // or logging the action if SNS isn't fully configured.
        
        try {
          // Typically you'd need the TargetArn of the user's email endpoint or SMS,
          // or you publish to a TopicArn that the users are subscribed to.
          // For demonstration, we'll try to publish assuming an email topic or just pass.
          
          if (process.env.AWS_SNS_TOPIC_ARN) {
             const command = new PublishCommand({
               TopicArn: process.env.AWS_SNS_TOPIC_ARN,
               Message: `Hi ${user.name || "Student"},\n\n${message}`,
               Subject: `Upcoming Exam: ${exam.subject?.name || "Subject"}`,
               MessageAttributes: {
                 email: {
                   DataType: "String",
                   StringValue: user.email,
                 }
               }
             })
             await snsClient.send(command)
          } else {
             console.log(`[SNS Mock] Sending to ${user.email}: ${message}`)
          }
          notificationsSent++
        } catch (err) {
          console.error(`Failed to send SNS to ${user.email}:`, err)
        }
      }
    }

    return NextResponse.json({ message: `Successfully sent ${notificationsSent} notifications.`, examsProcessed: exams.length })
  } catch (error) {
    console.error("Cron Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
