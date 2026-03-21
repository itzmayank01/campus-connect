"use client"

import { useState, useEffect } from "react"
import { Settings, User, Bell, Shield, Palette, Save, Loader2, Check, Moon, Sun } from "lucide-react"

interface UserProfile {
  name: string
  email: string
  semester: number | null
  branch: string | null
  department: string | null
  bio: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState("profile")

  // Form state
  const [name, setName] = useState("")
  const [semester, setSemester] = useState("")
  const [branch, setBranch] = useState("")
  const [bio, setBio] = useState("")

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        const user = data?.user || data
        if (user && !user.error) {
          setProfile({
            name: user.full_name || user.name || "",
            email: user.email || "",
            semester: user.semester || null,
            branch: user.branch || null,
            department: user.department || null,
            bio: user.bio || null,
          })
          setName(user.full_name || user.name || "")
          setSemester(user.semester?.toString() || "")
          setBranch(user.branch || "")
          setBio(user.bio || "")
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          semester: semester ? parseInt(semester) : null,
          branch,
          bio,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "privacy", label: "Privacy", icon: Shield },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#4F8EF7]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#64748B]/20 to-[#94A3B8]/20 shadow-sm">
          <Settings className="h-6 w-6 text-[#64748B]" />
        </div>
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F1117] font-display">
            Settings
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Manage your account preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] h-fit">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                  activeSection === section.id
                    ? "bg-[#4F8EF7]/[0.06] text-[#4F8EF7] border-l-2 border-[#4F8EF7]"
                    : "text-[#64748B] hover:text-[#0F1117] hover:bg-[#F8FAFC]"
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="rounded-2xl bg-white border border-[#F1F5F9] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          {activeSection === "profile" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0F1117]">Profile Settings</h2>
                <p className="text-sm text-[#64748B] mt-0.5">
                  Update your personal information
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 focus:border-[#4F8EF7] transition-all"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm text-[#94A3B8] cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#0F1117] focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 focus:border-[#4F8EF7] transition-all"
                  >
                    <option value="">Select semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1.5">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 focus:border-[#4F8EF7] transition-all"
                    placeholder="e.g., Computer Science"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1.5">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#0F1117] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F8EF7]/40 focus:border-[#4F8EF7] transition-all resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#4F8EF7] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#4F8EF7]/20 hover:bg-[#3B7AE0] transition-all disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0F1117]">Notification Preferences</h2>
                <p className="text-sm text-[#64748B] mt-0.5">
                  Choose what notifications you receive
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { label: "New uploads in my subjects", desc: "Get notified when someone uploads study material for your subjects", default: true },
                  { label: "Resource verified", desc: "When faculty verifies one of your uploads", default: true },
                  { label: "Trending updates", desc: "Weekly digest of trending resources", default: false },
                  { label: "Leaderboard position changes", desc: "When your ranking changes", default: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#0F1117]">{item.label}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.default} className="sr-only peer" />
                      <div className="w-9 h-5 bg-[#E2E8F0] peer-focus:ring-2 peer-focus:ring-[#4F8EF7]/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4F8EF7]" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0F1117]">Appearance</h2>
                <p className="text-sm text-[#64748B] mt-0.5">
                  Customize your visual experience
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center gap-2 rounded-xl border-2 border-[#4F8EF7] bg-[#4F8EF7]/5 p-6 transition-all">
                  <Sun className="h-6 w-6 text-[#4F8EF7]" />
                  <span className="text-sm font-semibold text-[#4F8EF7]">Light</span>
                </button>
                <button className="flex flex-col items-center gap-2 rounded-xl border border-[#E2E8F0] p-6 hover:bg-[#F8FAFC] transition-all">
                  <Moon className="h-6 w-6 text-[#64748B]" />
                  <span className="text-sm font-medium text-[#64748B]">Dark</span>
                  <span className="text-[10px] text-[#94A3B8]">Coming soon</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === "privacy" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0F1117]">Privacy & Security</h2>
                <p className="text-sm text-[#64748B] mt-0.5">
                  Manage your data and security preferences
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Show my uploads on leaderboard", desc: "Display your name publicly for uploaded resources", default: true },
                  { label: "Allow search behavior tracking", desc: "Helps us provide personalized recommendations in Smart Feed", default: true },
                  { label: "Show profile to other students", desc: "Let others see your profile and contributions", default: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#0F1117]">{item.label}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.default} className="sr-only peer" />
                      <div className="w-9 h-5 bg-[#E2E8F0] peer-focus:ring-2 peer-focus:ring-[#4F8EF7]/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4F8EF7]" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
