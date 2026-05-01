import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } from "@aws-sdk/client-ses"

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.SNS_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.SNS_AWS_SECRET_ACCESS_KEY || "",
  },
})

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    
    // Find exams exactly between 24 and 25 hours from now
    const tomorrowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    // Find exams exactly between 1 and 2 hours from now
    const oneHourStart = new Date(now.getTime() + 1 * 60 * 60 * 1000)
    const oneHourEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const [exams24h, exams1h] = await Promise.all([
      (prisma as any).exam.findMany({
        where: { date: { gte: tomorrowStart, lt: tomorrowEnd } },
        include: { subject: true, semester: true },
      }),
      (prisma as any).exam.findMany({
        where: { date: { gte: oneHourStart, lt: oneHourEnd } },
        include: { subject: true, semester: true },
      })
    ])

    if (exams24h.length === 0 && exams1h.length === 0) {
      return NextResponse.json({ message: "No exams scheduled for 24h or 1h alerts." })
    }

    let notificationsSent = 0
    const senderEmail = process.env.AWS_SES_SENDER_EMAIL

    if (!senderEmail) {
      console.error("Missing AWS_SES_SENDER_EMAIL in env vars.")
      return NextResponse.json({ error: "Missing AWS_SES_SENDER_EMAIL in env vars" }, { status: 500 })
    }

    const sendAlerts = async (exams: any[], is1Hour: boolean) => {
      for (const exam of exams) {
        const users = await prisma.user.findMany({
          where: { semester: exam.semester.number },
          select: { email: true, name: true },
        })

        const examTime = exam.date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        const examDate = exam.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

        const timeframeText = is1Hour ? "1 hour" : "24 hours"
        const message = `Alert: You have an upcoming ${exam.type} for ${exam.subject?.name || "your subject"} in ${timeframeText}!\nDate: ${examDate}\nTime: ${examTime}. Good luck!`
        const subject = is1Hour ? `HIGHLY IMPORTANT EXAM MAIL: ${exam.subject?.name}` : `Reminder: Exam in 24 hours - ${exam.subject?.name}`

        for (const user of users) {
          if (!user.email) continue
          
          try {
            const command = new SendEmailCommand({
              Source: senderEmail,
              Destination: { ToAddresses: [user.email] },
              Message: {
                Subject: { Data: subject },
                Body: { Text: { Data: `Hi ${user.name || "Student"},\n\n${message}` } },
              },
            })
            await sesClient.send(command)
            notificationsSent++
          } catch (err: any) {
            console.error(`Failed to send SES to ${user.email}:`, err.message)
            if (err.name === 'MessageRejected' || err.message?.includes('not verified') || err.message?.includes('Sandbox') || err.message?.includes('Unverified')) {
              console.log(`Auto-sending verification email to: ${user.email}`)
              try {
                await sesClient.send(new VerifyEmailIdentityCommand({ EmailAddress: user.email }))
              } catch (vErr) {
                console.error("Could not send verification email:", vErr)
              }
            }
          }
        }
      }
    }

    await sendAlerts(exams24h, false)
    await sendAlerts(exams1h, true)

    return NextResponse.json({ 
      message: `Successfully sent ${notificationsSent} notifications.`, 
      exams24hProcessed: exams24h.length,
      exams1hProcessed: exams1h.length 
    })
  } catch (error) {
    console.error("Cron Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
