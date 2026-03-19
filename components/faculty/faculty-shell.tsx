"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { FacultySidebar } from "@/components/faculty/faculty-sidebar"
import { FacultyHeader } from "@/components/faculty/faculty-header"
import type { User } from "@supabase/supabase-js"

interface FacultyShellProps {
  user: User
  children: React.ReactNode
}

export function FacultyShell({ user, children }: FacultyShellProps) {
  return (
    <SidebarProvider>
      <FacultySidebar />
      <SidebarInset>
        <FacultyHeader user={user} />
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#F8F9FC]">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
