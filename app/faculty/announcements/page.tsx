"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, Edit, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Announcement {
  id: string
  title: string
  message: string
  target: string
  publishedAt: string | null
  createdAt: string
}

export default function FacultyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [target, setTarget] = useState("all")

  useEffect(() => {
    fetch("/api/faculty/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(Array.isArray(d.announcements) ? d.announcements : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePost = async () => {
    if (!title.trim() || !message.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/faculty/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, target }),
      })
      if (res.ok) {
        const data = await res.json()
        setAnnouncements((prev) => [data.announcement, ...prev])
        setTitle("")
        setMessage("")
        setTarget("all")
        setShowForm(false)
      }
    } catch {}
    setSubmitting(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" /></div>
  }

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0F1117]">Announcements</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-[#22C55E] text-white hover:bg-[#16A34A] gap-2"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* Compose Form */}
      {showForm && (
        <div className="rounded-2xl bg-white border border-[#DCFCE7] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-sm font-bold text-[#0F1117] mb-4">Compose Announcement</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-[#334155]">Title</Label>
              <Input
                className="mt-1 h-10 rounded-xl"
                placeholder="Announcement title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm text-[#334155]">Message</Label>
              <textarea
                className="mt-1 w-full h-24 rounded-xl border border-[#E2E8F0] p-3 text-sm resize-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]"
                placeholder="Write your announcement..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm text-[#334155]">Target Audience</Label>
              <select
                className="mt-1 h-10 w-full rounded-xl border border-[#E2E8F0] px-3 text-sm"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="all">All Students</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={`semester_${s}`}>Semester {s}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePost}
                disabled={submitting || !title.trim() || !message.trim()}
                className="rounded-xl bg-[#22C55E] text-white hover:bg-[#16A34A]"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
                Post Announcement
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Posted Announcements */}
      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-[#0F1117]">{a.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] px-2 py-0.5 text-[10px]">
                    {a.target === "all" ? "All Students" : a.target.replace("semester_", "Semester ")}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">
                    {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-[#64748B] mt-2 whitespace-pre-wrap leading-relaxed">{a.message}</p>
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="text-sm text-[#94A3B8] text-center py-12">No announcements posted yet</p>
        )}
      </div>
    </div>
  )
}
