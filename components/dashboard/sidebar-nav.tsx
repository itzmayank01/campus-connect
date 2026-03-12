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
  { title: "Study Materials", href: "/dashboard/materials", icon: BookOpen },
  { title: "Subjects", href: "/dashboard/subjects", icon: GraduationCap },
  { title: "Semesters", href: "/dashboard/semesters", icon: Calendar },
  { title: "Bookmarks", href: "/dashboard/bookmarks", icon: Bookmark },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Logo / Brand */}
      <SidebarHeader className="p-4 pb-2">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
            <span className="text-sm font-bold text-primary-foreground">CC</span>
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground leading-tight">
              Campus
            </span>
            <span className="text-base font-bold tracking-tight text-sidebar-foreground leading-tight">
              Connect
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Main Nav */}
      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      size="default"
                      className={isActive
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground font-semibold rounded-xl shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl"
                      }
                    >
                      <Link href={item.href}>
                        <item.icon className="h-[18px] w-[18px]" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        {/* Upload Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">
            Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Upload Material"
                  className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-medium rounded-xl"
                >
                  <Link href="/dashboard/upload">
                    <Upload className="h-[18px] w-[18px]" />
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
              isActive={pathname === "/dashboard/settings"}
              tooltip="Settings"
              className={pathname === "/dashboard/settings"
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground rounded-xl"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl"
              }
            >
              <Link href="/dashboard/settings">
                <Settings className="h-[18px] w-[18px]" />
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
