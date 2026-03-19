import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const { resourceId } = await params
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, name: true, role: true },
    })
    if (!dbUser || dbUser.role !== "FACULTY") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { action, reason, otherReason } = body

    if (!action || !["verified", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Check resource exists and faculty didn't upload it
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, uploaderId: true },
    })
    if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    if (resource.uploaderId === dbUser.id) return NextResponse.json({ error: "Cannot verify own uploads" }, { status: 400 })

    // Upsert verification record
    await prisma.resourceVerification.upsert({
      where: { resourceId_facultyId: { resourceId, facultyId: dbUser.id } },
      create: {
        resourceId,
        facultyId: dbUser.id,
        action,
        reason: action === "rejected" ? reason : null,
        otherReason: action === "rejected" ? otherReason : null,
      },
      update: {
        action,
        reason: action === "rejected" ? reason : null,
        otherReason: action === "rejected" ? otherReason : null,
      },
    })

    if (action === "verified") {
      // Count total verifications for this resource
      const count = await prisma.resourceVerification.count({
        where: { resourceId, action: "verified" },
      })

      await prisma.resource.update({
        where: { id: resourceId },
        data: {
          isVerified: true,
          verificationCount: count,
          verifiedAt: new Date(),
          rejectionReason: null,
        },
      })
    } else {
      // Rejected
      await prisma.resource.update({
        where: { id: resourceId },
        data: {
          rejectionReason: reason || "Not specified",
        },
      })
    }

    return NextResponse.json({ success: true, action })
  } catch (err) {
    console.error("Faculty verify error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
