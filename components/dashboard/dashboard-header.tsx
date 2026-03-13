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
import { SearchDialog, useSearchShortcut } from "@/components/dashboard/search-dialog"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface DashboardHeaderProps {
  user: SupabaseUser | null
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter()
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchShortcut()

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Student"

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const hasUnread = true

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-[rgba(0,0,0,0.06)] bg-white/95 backdrop-blur-md px-4 md:px-6">
        <SidebarTrigger className="-ml-1 text-[#6B7280] hover:text-[#0F1117]" />

        {/* Search Trigger */}
        <button
          id="dashboard-search"
          onClick={() => setSearchOpen(true)}
          className="group relative flex h-9 flex-1 max-w-md items-center gap-2 rounded-xl bg-[#F1F3F9] px-3 text-sm text-[#6B7280] border border-[rgba(0,0,0,0.06)] transition-all duration-200 hover:bg-[#E8EBF3] focus-visible:ring-2 focus-visible:ring-[#4F8EF7]/40 focus-visible:bg-white"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Search subjects, topics, notes...</span>
          <span className="sm:hidden">Search...</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 items-center gap-0.5 rounded-md border border-[rgba(0,0,0,0.08)] bg-white px-1.5 font-mono text-[10px] font-medium text-[#6B7280] sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {/* Upload Material */}
          <Button
            onClick={() => router.push("/dashboard/upload/new")}
            className="relative overflow-hidden gap-2 rounded-xl bg-[#4F8EF7] text-white hover:bg-[#4F8EF7]/90 shadow-lg shadow-[#4F8EF7]/20 transition-all duration-200 hidden sm:flex group"
            id="upload-material-header-btn"
          >
            <Upload className="h-4 w-4" />
            Upload Material
            {/* Shimmer overlay */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer pointer-events-none" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className={`relative h-9 w-9 rounded-xl text-[#6B7280] hover:text-[#0F1117] hover:bg-[#F1F3F9] ${hasUnread ? "animate-wiggle" : ""}`}
            id="notifications-btn"
          >
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
            )}
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 rounded-xl px-2 text-[#0F1117] hover:bg-[#F1F3F9]" id="user-menu-btn">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-[rgba(0,0,0,0.08)]"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4F8EF7]/10 text-xs font-semibold text-[#4F8EF7] ring-2 ring-[rgba(0,0,0,0.06)]">
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
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
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

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
