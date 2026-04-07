"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Calendar,
  Bookmark,
  Settings,
  Upload,
  BarChart3,
  Trophy,
  Sparkles,
  FlaskConical,
  Download,
  Eraser,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Study Materials", href: "/dashboard/study-materials", icon: BookOpen },
  { title: "Study Lab", href: "/dashboard/study-lab", icon: FlaskConical, hasAiBadge: true },
  { title: "Subjects", href: "/dashboard/subjects", icon: GraduationCap },
  { title: "Semesters", href: "/dashboard/semesters", icon: Calendar },
  { title: "Downloads", href: "/dashboard/downloads", icon: Download },
  { title: "Bookmarks", href: "/dashboard/bookmarks", icon: Bookmark },
  { title: "Text Cleaner", href: "/dashboard/text-cleaner", icon: Eraser },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Smart Feed", href: "/dashboard/smart-feed", icon: Sparkles, hasNewBadge: true },
  { title: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy, hasLiveBadge: true },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[rgba(0,0,0,0.06)] bg-white/80 backdrop-blur-xl"
    >
      {/* Logo / Brand */}
      <SidebarHeader className="p-4 pb-2">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F8EF7] shadow-lg shadow-[#4F8EF7]/20">
            <span className="text-sm font-bold text-white">CC</span>
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-bold tracking-tight text-[#0F1117] leading-tight">
              Campus
            </span>
            <span className="font-display text-base font-bold tracking-tight text-[#0F1117] leading-tight">
              Connect
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Main Nav */}
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-[#6B7280] font-semibold mb-1 px-3">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      size="default"
                      className={
                        isActive
                          ? "relative border-l-2 border-[#4F8EF7] bg-[#4F8EF7]/[0.06] text-[#4F8EF7] hover:bg-[#4F8EF7]/[0.1] hover:text-[#4F8EF7] font-semibold rounded-lg shadow-[0_0_12px_rgba(79,142,247,0.1)] transition-all duration-150 ease-out"
                          : "text-[#6B7280] hover:text-[#0F1117] hover:bg-[rgba(0,0,0,0.03)] rounded-lg transition-all duration-150 ease-out"
                      }
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" strokeWidth={1.75} />
                        <span>{item.title}</span>
                        {/* LIVE badge for Leaderboard */}
                        {"hasLiveBadge" in item && item.hasLiveBadge && (
                          <span
                            className="group-data-[collapsible=icon]:hidden ml-auto"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 32,
                              height: 16,
                              borderRadius: 999,
                              backgroundColor: "#EF4444",
                              color: "#fff",
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                              animation: "livePulse 1.5s ease-in-out infinite",
                            }}
                          >
                            LIVE
                          </span>
                        )}
                        {/* AI badge for Study Lab */}
                        {"hasAiBadge" in item && item.hasAiBadge && (
                          <span
                            className="group-data-[collapsible=icon]:hidden ml-auto"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 22,
                              height: 16,
                              borderRadius: 999,
                              background: "linear-gradient(135deg, #8B5CF6, #6366F1)",
                              color: "#fff",
                              fontSize: 8,
                              fontWeight: 700,
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                            }}
                          >
                            AI
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2 bg-[rgba(0,0,0,0.06)]" />

        {/* Upload Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-[#6B7280] font-semibold mb-1 px-3">
            Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Your Uploads"
                  className="bg-[#4F8EF7]/[0.06] text-[#4F8EF7] hover:bg-[#4F8EF7]/[0.12] hover:text-[#4F8EF7] font-medium rounded-lg transition-all duration-150 ease-out"
                >
                  <Link href="/dashboard/upload">
                    <Upload className="h-5 w-5" strokeWidth={1.75} />
                    <span>Your Uploads</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Bottom: Settings */}
      <SidebarFooter className="px-3 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/dashboard/settings"}
              tooltip="Settings"
              className={
                pathname === "/dashboard/settings"
                  ? "border-l-2 border-[#4F8EF7] bg-[#4F8EF7]/[0.06] text-[#4F8EF7] hover:bg-[#4F8EF7]/[0.1] font-semibold rounded-lg transition-all duration-150 ease-out"
                  : "text-[#6B7280] hover:text-[#0F1117] hover:bg-[rgba(0,0,0,0.03)] rounded-lg transition-all duration-150 ease-out"
              }
            >
              <Link href="/dashboard/settings">
                <Settings className="h-5 w-5" strokeWidth={1.75} />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
