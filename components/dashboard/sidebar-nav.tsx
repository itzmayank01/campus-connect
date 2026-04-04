"use client"

import { useState, useEffect } from "react"
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
  FileText,
  Video,
  HelpCircle,
  Archive,
  ChevronDown,
  ChevronRight,
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
  { title: "Bookmarks", href: "/dashboard/bookmarks", icon: Bookmark },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Smart Feed", href: "/dashboard/smart-feed", icon: Sparkles, hasNewBadge: true },
  { title: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy, hasLiveBadge: true },
]

interface DownloadedResource {
  id: string
  originalFilename: string
  resourceType: string
  mimeType: string
  downloadedAt: string
  subject?: { id: string; name: string; code: string }
}

const resourceTypeIcons: Record<string, typeof FileText> = {
  NOTES: FileText,
  QUESTION_PAPERS: HelpCircle,
  VIDEOS: Video,
  SYLLABUS: BookOpen,
  REFERENCE: BookOpen,
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const [downloads, setDownloads] = useState<DownloadedResource[]>([])
  const [showDownloads, setShowDownloads] = useState(false)
  const [loadingDownloads, setLoadingDownloads] = useState(false)

  useEffect(() => {
    setLoadingDownloads(true)
    fetch("/api/user/downloads?limit=8")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.downloads)) {
          setDownloads(data.downloads)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDownloads(false))
  }, [])

  const getResourceIcon = (resource: DownloadedResource) => {
    if (resource.originalFilename?.endsWith(".zip")) return Archive
    return resourceTypeIcons[resource.resourceType] || FileText
  }

  const getResourceColor = (type: string) => {
    switch (type) {
      case "NOTES": return "#3B82F6"
      case "QUESTION_PAPERS": return "#8B5CF6"
      case "VIDEOS": return "#EF4444"
      case "SYLLABUS": return "#10B981"
      case "REFERENCE": return "#F59E0B"
      default: return "#64748B"
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "Just now"
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  }

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

        {/* Downloaded Resources Section */}
        <SidebarGroup>
          <div className="group-data-[collapsible=icon]:hidden">
            <button
              onClick={() => setShowDownloads(!showDownloads)}
              className="flex items-center justify-between w-full text-[10px] uppercase tracking-[0.15em] text-[#6B7280] font-semibold mb-1 px-3 py-1 hover:text-[#0F1117] transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Download className="h-3 w-3" />
                Downloaded
                {downloads.length > 0 && (
                  <span
                    className="inline-flex items-center justify-center rounded-full text-white"
                    style={{
                      width: 16,
                      height: 16,
                      fontSize: 9,
                      fontWeight: 700,
                      background: "linear-gradient(135deg, #10B981, #059669)",
                    }}
                  >
                    {downloads.length}
                  </span>
                )}
              </span>
              {showDownloads ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>

            {showDownloads && (
              <div className="space-y-0.5 mt-1 max-h-[280px] overflow-y-auto scrollbar-thin">
                {loadingDownloads ? (
                  <div className="px-3 py-3 text-center">
                    <div className="h-4 w-4 border-2 border-[#4F8EF7] border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : downloads.length > 0 ? (
                  <>
                    {downloads.map((resource) => {
                      const Icon = getResourceIcon(resource)
                      const color = getResourceColor(resource.resourceType)
                      return (
                        <Link
                          key={resource.id}
                          href={`/dashboard/subjects/${resource.subject?.id || ""}`}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[rgba(0,0,0,0.03)] transition-all duration-150 no-underline group/dl"
                        >
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${color}12` }}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color }} strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-[#334155] truncate group-hover/dl:text-[#4F8EF7] transition-colors leading-tight">
                              {resource.originalFilename}
                            </p>
                            <div className="flex items-center gap-1">
                              {resource.subject && (
                                <span className="text-[9px] text-[#94A3B8] font-medium">
                                  {resource.subject.code}
                                </span>
                              )}
                              <span className="text-[9px] text-[#CBD5E1]">•</span>
                              <span className="text-[9px] text-[#CBD5E1]">
                                {formatTimeAgo(resource.downloadedAt)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                    <Link
                      href="/dashboard/study-materials"
                      className="flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-semibold text-[#4F8EF7] hover:bg-[#4F8EF7]/5 rounded-lg transition-colors no-underline"
                    >
                      View All in Study Materials
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </>
                ) : (
                  <div className="px-3 py-4 text-center">
                    <Download className="h-5 w-5 text-[#E2E8F0] mx-auto mb-1" />
                    <p className="text-[10px] text-[#94A3B8]">
                      No downloads yet
                    </p>
                    <p className="text-[9px] text-[#CBD5E1] mt-0.5">
                      Downloaded resources appear here
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Collapsed state: just icon */}
          <div className="hidden group-data-[collapsible=icon]:block">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={`Downloaded (${downloads.length})`}
                  className="text-[#6B7280] hover:text-[#0F1117] hover:bg-[rgba(0,0,0,0.03)] rounded-lg"
                >
                  <Download className="h-5 w-5" strokeWidth={1.75} />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
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
