"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, LogOut, User, Settings, Upload, Lock } from "lucide-react"
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

interface RichUser {
  id: string
  user_id_display: string
  full_name: string
  username: string
  email: string
  avatar_url: string | null
  semester: number
  branch: string
  role: string
}

export function DashboardHeader() {
  const router = useRouter()
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchShortcut()
  const [dbUser, setDbUser] = useState<RichUser | null>(null)

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/users/me")
      if (res.ok) {
        const data = await res.json()
        setDbUser(data.user)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchUser()
    window.addEventListener("profile-updated", fetchUser)
    window.addEventListener("avatar-updated", fetchUser)
    return () => {
      window.removeEventListener("profile-updated", fetchUser)
      window.removeEventListener("avatar-updated", fetchUser)
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const getAvatarColor = (id: string) => {
    if (!id) return "#94A3B8"
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6']
    return colors[id.charCodeAt(0) % colors.length]
  }

  const displayName = dbUser?.full_name || "Student"
  const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U"
  const avatarUrl = dbUser?.avatar_url
  const hasUnread = true

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
              <Button variant="ghost" className="h-[36px] gap-2 rounded-full pl-1 pr-3 py-1 text-[#0F1117] hover:bg-[#F1F3F9] flex items-center" id="user-menu-btn">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    className="ring-2 ring-[rgba(0,0,0,0.08)]"
                  />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: getAvatarColor(dbUser?.id || ""),
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0
                  }}>
                    {initials}
                  </div>
                )}
                <span className="hidden text-sm font-medium md:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-[240px] rounded-xl p-0 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.12)] border-[#E2E8F0]">
              <div className="p-4 bg-white border-b border-[#E2E8F0] flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", background: getAvatarColor(dbUser?.id || ""),
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700
                  }}>
                    {initials}
                  </div>
                )}
                <div className="flex flex-col">
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>{displayName}</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{dbUser?.username ? `@${dbUser.username}` : "Student"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#64748B", fontWeight: 600 }}>{dbUser?.user_id_display || "CC-PENDING"}</span>
                    <Lock size={8} color="#CBD5E1" />
                  </div>
                </div>
              </div>
              
              <div className="p-1.5">
                <DropdownMenuItem onClick={() => router.push("/dashboard/profile")} className="rounded-lg cursor-pointer my-0.5">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")} className="rounded-lg cursor-pointer my-0.5">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </div>

              <div className="p-1.5 border-t border-[#E2E8F0]">
                <DropdownMenuItem onClick={handleSignOut} className="text-[#EF4444] focus:text-[#EF4444] focus:bg-[#FEF2F2] rounded-lg cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
