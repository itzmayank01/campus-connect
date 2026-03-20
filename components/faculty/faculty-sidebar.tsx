"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  Trophy,
  MessageSquare,
  CheckCircle,
  Megaphone,
  Award,
  Settings,
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
  { title: "Overview", href: "/faculty/dashboard", icon: LayoutDashboard },
  { title: "My Uploads", href: "/faculty/uploads", icon: Upload },
  { title: "Analytics", href: "/faculty/analytics", icon: BarChart3 },
  { title: "Leaderboard", href: "/faculty/leaderboard", icon: Trophy },
  { title: "Student Feedback", href: "/faculty/feedback", icon: MessageSquare },
  { title: "Verify Uploads", href: "/faculty/verify", icon: CheckCircle, hasPendingBadge: true },
  { title: "Announcements", href: "/faculty/announcements", icon: Megaphone },
  { title: "Achievements", href: "/faculty/achievements", icon: Award },
]

export function FacultySidebar() {
  const pathname = usePathname()

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[rgba(0,0,0,0.06)] bg-white/80 backdrop-blur-xl"
    >
      {/* Logo / Brand */}
      <SidebarHeader className="p-4 pb-2">
        <Link href="/faculty/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22C55E] shadow-lg shadow-[#22C55E]/20">
            <span className="text-sm font-bold text-white">CC</span>
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-bold tracking-tight text-[#0F1117] leading-tight">
              Campus
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-base font-bold tracking-tight text-[#0F1117] leading-tight">
                Connect
              </span>
              <span className="rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] px-2 py-0 text-[10px] font-bold">
                Faculty
              </span>
            </div>
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
                          ? "relative border-l-2 border-[#22C55E] bg-[#22C55E]/[0.06] text-[#22C55E] hover:bg-[#22C55E]/[0.1] hover:text-[#22C55E] font-semibold rounded-lg shadow-[0_0_12px_rgba(34,197,94,0.1)] transition-all duration-150 ease-out"
                          : "text-[#6B7280] hover:text-[#0F1117] hover:bg-[rgba(0,0,0,0.03)] rounded-lg transition-all duration-150 ease-out"
                      }
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" strokeWidth={1.75} />
                        <span>{item.title}</span>
                        {"hasPendingBadge" in item && item.hasPendingBadge && (
                          <span
                            className="group-data-[collapsible=icon]:hidden ml-auto"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 20,
                              height: 18,
                              borderRadius: 999,
                              backgroundColor: "#EF4444",
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "0 5px",
                            }}
                          >
                            •
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
                  tooltip="Upload Material"
                  className="bg-[#22C55E]/[0.06] text-[#22C55E] hover:bg-[#22C55E]/[0.12] hover:text-[#22C55E] font-medium rounded-lg transition-all duration-150 ease-out"
                >
                  <Link href="/faculty/upload">
                    <Upload className="h-5 w-5" strokeWidth={1.75} />
                    <span>Upload Material</span>
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
              isActive={pathname === "/faculty/settings"}
              tooltip="Settings"
              className={
                pathname === "/faculty/settings"
                  ? "border-l-2 border-[#22C55E] bg-[#22C55E]/[0.06] text-[#22C55E] hover:bg-[#22C55E]/[0.1] font-semibold rounded-lg transition-all duration-150 ease-out"
                  : "text-[#6B7280] hover:text-[#0F1117] hover:bg-[rgba(0,0,0,0.03)] rounded-lg transition-all duration-150 ease-out"
              }
            >
              <Link href="/faculty/settings">
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
