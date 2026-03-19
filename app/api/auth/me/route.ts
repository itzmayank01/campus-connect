import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, role: true, name: true, email: true, facultyId: true },
    })

    if (!dbUser) {
      return NextResponse.json({ role: null, needsRoleSetup: true })
    }

    return NextResponse.json({
      role: dbUser.role.toLowerCase(),
      name: dbUser.name,
      email: dbUser.email,
      facultyId: dbUser.facultyId,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
