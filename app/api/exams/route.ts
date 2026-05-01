import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } from "@aws-sdk/client-ses"
import { createClient } from "@/lib/supabase/server"

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.SNS_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.SNS_AWS_SECRET_ACCESS_KEY || "",
  },
})

// GET /api/exams — list upcoming exams
export async function GET() {
  try {
    const now = new Date()
    const exams = await (prisma as any).exam.findMany({
      where: { date: { gte: now } },
      orderBy: { date: "asc" },
      take: 10,
      include: { subject: true, semester: true },
    })
    return NextResponse.json(exams)
  } catch (error: unknown) {
    return NextResponse.json({ error: "Exam table not available yet. Run prisma db push first." }, { status: 500 })
  }
}

// POST /api/exams — create a new exam
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, subjectId, semesterId, date, type = "endterm" } = body

    if (!name || !subjectId || !semesterId || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const exam = await (prisma as any).exam.create({
      data: { name, subjectId, semesterId, date: new Date(date), type },
      include: { subject: true, semester: true },
    })

    // Immediate SES Notification
    try {
      const users = await prisma.user.findMany({
        where: { semester: exam.semester.number },
        select: { email: true, name: true, supabaseId: true },
      })

      const supabase = await createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (authUser && !users.find(u => u.supabaseId === authUser.id)) {
        const currentUser = await prisma.user.findUnique({
          where: { supabaseId: authUser.id },
          select: { email: true, name: true, supabaseId: true }
        })
        if (currentUser) {
          users.push(currentUser)
        }
      }

      const examDateObj = new Date(date)
      const examTime = examDateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      const examDateStr = examDateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      const daysLeft = Math.ceil((examDateObj.getTime() - new Date().getTime()) / (1000 * 3600 * 24))

      const message = `A new exam has been scheduled!\n\nExam: ${exam.type} for ${exam.subject?.name || "your subject"}\nDate: ${examDateStr}\nTime: ${examTime}\nDays Left: ${daysLeft} days.\n\nStart preparing now! Good luck!`
      const senderEmail = process.env.AWS_SES_SENDER_EMAIL

      if (senderEmail) {
        for (const user of users) {
          if (!user.email) continue
          
          try {
            const command = new SendEmailCommand({
              Source: senderEmail,
              Destination: { ToAddresses: [user.email] },
              Message: {
                Subject: { Data: `New Exam Added: ${exam.subject?.name || "Subject"}` },
                Body: { Text: { Data: `Hi ${user.name || "Student"},\n\n${message}` } },
              },
            })
            await sesClient.send(command)
          } catch (err: any) {
            console.error("SES Error for", user.email, ":", err.message)
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
      } else {
        console.log("No AWS_SES_SENDER_EMAIL configured. Could not send email.")
      }
    } catch (sesError) {
      console.error("Failed to process immediate SES notification:", sesError)
    }

    return NextResponse.json(exam, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 })
  }
}
