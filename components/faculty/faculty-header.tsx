"use client"

import { useRouter } from "next/navigation"
import { Bell, Search, LogOut, User, Settings, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface FacultyHeaderProps {
  user: SupabaseUser | null
}

export function FacultyHeader({ user }: FacultyHeaderProps) {
  const router = useRouter()

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Faculty"

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-[rgba(0,0,0,0.06)] bg-white/95 backdrop-blur-md px-4 md:px-6">
      <SidebarTrigger className="-ml-1 text-[#6B7280] hover:text-[#0F1117]" />

      <div className="flex-1" />

      <div className="flex items-center gap-2 ml-auto">
        {/* Upload Material */}
        <Button
          onClick={() => router.push("/faculty/upload")}
          className="relative overflow-hidden gap-2 rounded-xl bg-[#22C55E] text-white hover:bg-[#16A34A] shadow-lg shadow-[#22C55E]/20 transition-all duration-200 hidden sm:flex group"
        >
          <Upload className="h-4 w-4" />
          Upload Material
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-[#6B7280] hover:text-[#0F1117] hover:bg-[#F1F3F9]"
        >
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 rounded-xl px-2 text-[#0F1117] hover:bg-[#F1F3F9]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-[rgba(0,0,0,0.08)]"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#22C55E]/10 text-xs font-semibold text-[#22C55E] ring-2 ring-[rgba(0,0,0,0.06)]">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden text-sm font-medium md:inline">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-[#6B7280]">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/faculty/dashboard")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/faculty/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-[#EF4444] focus:text-[#EF4444]">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
