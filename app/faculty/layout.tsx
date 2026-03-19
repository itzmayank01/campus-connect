import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { FacultyShell } from "@/components/faculty/faculty-shell"

export default async function FacultyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  // Check role
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== "FACULTY") {
    redirect("/dashboard")
  }

  return <FacultyShell user={user}>{children}</FacultyShell>
}
