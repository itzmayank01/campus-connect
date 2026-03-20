"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  FileText,
  GraduationCap,
  Calendar,
  Upload,
  Bookmark,
  BarChart3,
  HelpCircle,
  Video,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

/* ─── Static search data (will be replaced with Prisma queries later) ─── */

const subjects = [
  { name: "Data Structures & Algorithms", code: "DSA", semester: 3 },
  { name: "Database Management Systems", code: "DBMS", semester: 3 },
  { name: "Computer Organization & Architecture", code: "COA", semester: 3 },
  { name: "Operating Systems", code: "OS", semester: 4 },
  { name: "Computer Networks", code: "CN", semester: 4 },
  { name: "Software Engineering", code: "SE", semester: 4 },
  { name: "Machine Learning", code: "ML", semester: 5 },
  { name: "Compiler Design", code: "Compiler", semester: 5 },
  { name: "Design & Analysis of Algorithms", code: "DAA", semester: 5 },
  { name: "Artificial Intelligence", code: "AI", semester: 6 },
  { name: "Cloud Computing", code: "Cloud", semester: 6 },
  { name: "Internet of Things", code: "IoT", semester: 6 },
  { name: "Mathematics I", code: "Math I", semester: 1 },
  { name: "Physics", code: "Physics", semester: 1 },
  { name: "Chemistry", code: "Chemistry", semester: 1 },
  { name: "Mathematics II", code: "Math II", semester: 2 },
  { name: "Basic Electrical Engineering", code: "BEE", semester: 2 },
]

const notes = [
  { title: "Data Structures & Algorithms", subject: "DSA", type: "notes", semester: 3 },
  { title: "Database Management Systems", subject: "DBMS", type: "notes", semester: 3 },
  { title: "Operating Systems - Complete Notes", subject: "OS", type: "notes", semester: 4 },
  { title: "Computer Networks - Unit 1-3", subject: "CN", type: "notes", semester: 4 },
  { title: "DSA Mid-Semester 2024", subject: "DSA", type: "question_papers", semester: 3 },
  { title: "DBMS Final Exam 2024", subject: "DBMS", type: "question_papers", semester: 3 },
  { title: "Binary Tree Traversals - Explained", subject: "DSA", type: "videos", semester: 3 },
  { title: "CLRS - Introduction to Algorithms", subject: "DSA", type: "reference", semester: 3 },
]

const semesters = [
  { number: 1, subjects: ["Math I", "Physics", "Chemistry"], notes: 42 },
  { number: 2, subjects: ["Math II", "BEE", "Workshop"], notes: 38 },
  { number: 3, subjects: ["DSA", "COA", "DBMS"], notes: 56 },
  { number: 4, subjects: ["OS", "CN", "SE"], notes: 61 },
  { number: 5, subjects: ["ML", "Compiler", "DAA"], notes: 48 },
  { number: 6, subjects: ["AI", "Cloud", "IoT"], notes: 35 },
  { number: 7, subjects: ["Blockchain", "DevOps"], notes: 29 },
  { number: 8, subjects: ["Project", "Seminar"], notes: 18 },
]

const quickActions = [
  { label: "Upload Material", icon: Upload, href: "/dashboard/upload" },
  { label: "My Bookmarks", icon: Bookmark, href: "/dashboard/bookmarks" },
  { label: "View Analytics", icon: BarChart3, href: "/dashboard/analytics" },
]

/* ─── Icon helpers ─── */

function getNoteIcon(type: string) {
  switch (type) {
    case "question_papers":
      return HelpCircle
    case "videos":
      return Video
    case "reference":
      return BookOpen
    default:
      return FileText
  }
}

function getNoteLabel(type: string) {
  switch (type) {
    case "question_papers":
      return "PYQ"
    case "videos":
      return "Video"
    case "reference":
      return "Ref"
    default:
      return "Notes"
  }
}

/* ─── Component ─── */

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState("")

  // Track search silently in the background
  const trackSearch = useCallback((query: string) => {
    if (!query || query.length < 2) return
    const normalizedQuery = query.toLowerCase().trim()
    // Signal smart feed to show recommendations
    if (typeof window !== "undefined") {
      localStorage.setItem("lastSearchQuery", normalizedQuery)
      window.dispatchEvent(new Event("searchTracked"))
    }
    // Track in backend silently
    fetch("/api/behavior/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: normalizedQuery }),
    }).catch(() => {})
  }, [])

  const runCommand = useCallback(
    (command: () => void, searchContext?: string) => {
      const query = searchContext || searchInput
      if (query) trackSearch(query)
      onOpenChange(false)
      command()
    },
    [onOpenChange, searchInput, trackSearch]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Campus Connect"
      description="Search subjects, notes, semesters, and quick actions"
      showCloseButton={false}
    >
      <CommandInput placeholder="Search subjects, notes, semesters..." onValueChange={setSearchInput} />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-3 py-6 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-[#F97316]/20">
              <Sparkles className="h-6 w-6 text-[#F59E0B]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#0F1117]">No direct matches found</p>
              <p className="text-xs text-[#64748B] mt-1">But our AI can help you find what you need!</p>
            </div>
            {searchInput && (
              <button
                onClick={() => runCommand(() => router.push(`/dashboard/smart-feed?q=${encodeURIComponent(searchInput)}`), searchInput)}
                className="mt-2 flex items-center gap-2 rounded-xl bg-[#4F8EF7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B7AE0] transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Ask Campus AI for &quot;{searchInput}&quot;
              </button>
            )}
          </div>
        </CommandEmpty>

        {/* AI Smart Search (Always available when typing) */}
        {searchInput.length > 1 && (
          <>
            <CommandGroup heading="Campus AI">
              <CommandItem
                onSelect={() => runCommand(() => router.push(`/dashboard/smart-feed?q=${encodeURIComponent(searchInput)}`), searchInput)}
                className="gap-3 rounded-xl bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] hover:from-[#DBEAFE] hover:to-[#BFDBFE] transition-colors py-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F8EF7]/20">
                  <Sparkles className="h-4 w-4 text-[#4F8EF7]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#1E3A8A]">
                    Ask Campus AI for &quot;{searchInput}&quot;
                  </span>
                  <span className="text-[11px] font-medium text-[#3B82F6]">
                    Get personalized resources and study tips
                  </span>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-[#4F8EF7]" />
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem
              key={action.label}
              onSelect={() => runCommand(() => router.push(action.href))}
              className="gap-3 rounded-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">{action.label}</span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Subjects */}
        <CommandGroup heading="Subjects">
          {subjects.map((subject) => (
            <CommandItem
              key={subject.code}
              value={`${subject.name} ${subject.code}`}
              onSelect={() =>
                runCommand(() => router.push(`/dashboard/subjects`))
              }
              className="gap-3 rounded-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <GraduationCap className="h-4 w-4 text-violet-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{subject.name}</span>
                <span className="text-xs text-muted-foreground">
                  {subject.code} • Semester {subject.semester}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Notes & Materials */}
        <CommandGroup heading="Notes & Materials">
          {notes.map((note, i) => {
            const NoteIcon = getNoteIcon(note.type)
            return (
              <CommandItem
                key={`${note.title}-${i}`}
                value={`${note.title} ${note.subject} ${note.type}`}
                onSelect={() =>
                  runCommand(() => router.push(`/dashboard/materials`))
                }
                className="gap-3 rounded-lg"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <NoteIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{note.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {getNoteLabel(note.type)} • {note.subject} • Sem {note.semester}
                  </span>
                </div>
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandSeparator />

        {/* Semesters */}
        <CommandGroup heading="Semesters">
          {semesters.map((sem) => (
            <CommandItem
              key={sem.number}
              value={`Semester ${sem.number} ${sem.subjects.join(" ")}`}
              onSelect={() =>
                runCommand(() => router.push(`/dashboard/semesters`))
              }
              className="gap-3 rounded-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Semester {sem.number}</span>
                <span className="text-xs text-muted-foreground">
                  {sem.subjects.join(", ")} • {sem.notes} notes
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1.5 font-sans text-[10px] font-medium">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1.5 font-sans text-[10px] font-medium">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1.5 font-sans text-[10px] font-medium">esc</kbd>
            close
          </span>
        </div>
      </div>
    </CommandDialog>
  )
}

/* ─── Hook: global keyboard shortcut ─── */

export function useSearchShortcut() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return { open, setOpen }
}
