import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { deleteS3Object, S3_BUCKET } from "@/lib/s3"

// DELETE /api/upload/delete — delete one or more uploaded files
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { noteIds } = body as { noteIds: string[] }

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: noteIds (array of note IDs)" },
        { status: 400 }
      )
    }

    // Find the current user in DB
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch the resources that belong to this user
    const resources = await prisma.resource.findMany({
      where: {
        id: { in: noteIds },
        uploaderId: dbUser.id,
      },
    })

    if (resources.length === 0) {
      return NextResponse.json(
        { error: "No matching files found or you don't own these files" },
        { status: 404 }
      )
    }

    // Delete from S3 and DB
    const deletedIds: string[] = []
    const errors: string[] = []

    for (const res of resources) {
      try {
        // Try to delete from S3 (don't block DB deletion if S3 fails)
        if (res.s3Key) {
          try {
            await deleteS3Object(res.s3Key)
          } catch (s3Err) {
            console.warn(`S3 delete failed for resource ${res.id}, continuing with DB delete:`, s3Err)
          }
        }

        // Delete associated relational fields before resource drop due to foreign key constraints
        await prisma.resourceLike.deleteMany({ where: { resourceId: res.id } })
        await prisma.resourceRating.deleteMany({ where: { resourceId: res.id } })
        await prisma.resourceDownload.deleteMany({ where: { resourceId: res.id } })

        // Delete the resource record
        await prisma.resource.delete({ where: { id: res.id } })

        deletedIds.push(res.id)
      } catch (err: any) {
        console.error(`Failed to delete resource ${res.id}:`, err)
        errors.push(res.id)
      }
    }

    return NextResponse.json({
      deleted: deletedIds,
      errors,
      message: `${deletedIds.length} file(s) deleted successfully${errors.length > 0 ? `, ${errors.length} failed` : ""}`,
    })
  } catch (error: any) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete files", details: error.message },
      { status: 500 }
    )
  }
}
