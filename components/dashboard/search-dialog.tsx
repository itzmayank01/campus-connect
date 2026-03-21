"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  GraduationCap,
  Calendar,
  Upload,
  Bookmark,
  BarChart3,
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
} from "@/components/ui/command"

/* ─── All curriculum subjects (embedded for instant search with zero API latency) ─── */

const CURRICULUM_SUBJECTS = [
  // Semester 1
  { name: "Linux Lab", code: "CSEG1126", semester: 1, category: "MC" },
  { name: "Programming in C", code: "CSEG1025", semester: 1, category: "MC" },
  { name: "Programming in C Lab", code: "CSEG1125", semester: 1, category: "MC" },
  { name: "Problem Solving", code: "CSEG1027", semester: 1, category: "ENGG" },
  { name: "Environment Sustainability & Climate Change", code: "SSEN0101", semester: 1, category: "SCI" },
  { name: "Living Conversations", code: "SLLS0101", semester: 1, category: "LSC" },
  { name: "Advanced Engineering Mathematics - 1", code: "MATH1059", semester: 1, category: "SCI" },
  { name: "Physics for Computer Engineers", code: "PHYS1032", semester: 1, category: "SCI" },
  { name: "Physics Lab for Computer Engineers", code: "PHYS1132", semester: 1, category: "SCI" },
  // Semester 2
  { name: "Computer Organization and Architecture", code: "CSEG1032", semester: 2, category: "ENGG" },
  { name: "Data Structures and Algorithms", code: "CSEG1033", semester: 2, category: "MC" },
  { name: "Data Structures and Algorithms Lab", code: "CSEG1034", semester: 2, category: "MC" },
  { name: "Python Programming", code: "CSEG1035", semester: 2, category: "MC" },
  { name: "Python Programming Lab", code: "CSEG1135", semester: 2, category: "MC" },
  { name: "Digital Electronics", code: "ECEG1012", semester: 2, category: "ENGG" },
  { name: "Critical Thinking and Writing", code: "SLSG0102", semester: 2, category: "LSC" },
  { name: "Environment Sustainability and Climate Change (Living Lab)", code: "SSEN0102", semester: 2, category: "SCI" },
  { name: "Advanced Engineering Mathematics - 2", code: "MATH1065", semester: 2, category: "SCI" },
  // Semester 3
  { name: "Elements of AIML", code: "CSAI2015", semester: 3, category: "MC" },
  { name: "Elements of AIML Lab", code: "CSAI2115", semester: 3, category: "MC" },
  { name: "Database Management Systems", code: "CSEG2046", semester: 3, category: "MC" },
  { name: "Database Management Systems Lab", code: "CSEG2146", semester: 3, category: "MC" },
  { name: "Design and Analysis of Algorithms", code: "CSEG2021", semester: 3, category: "MC" },
  { name: "Design and Analysis of Algorithms Lab", code: "CSEG2121", semester: 3, category: "MC" },
  { name: "Discrete Mathematical Structures", code: "CSEG2006", semester: 3, category: "MC" },
  { name: "Operating Systems", code: "CSEG2060", semester: 3, category: "MC" },
  { name: "Design Thinking", code: "SLLS0201", semester: 3, category: "LSC" },
  // Semester 4
  { name: "Data Communication and Networks", code: "CSEG2065", semester: 4, category: "MC" },
  { name: "Data Communication and Networks Lab", code: "CSEG2165", semester: 4, category: "MC" },
  { name: "Object Oriented Programming", code: "CSEG2020", semester: 4, category: "MC" },
  { name: "Object Oriented Programming Lab", code: "CSEG2120", semester: 4, category: "MC" },
  { name: "Software Engineering", code: "CSEG2064", semester: 4, category: "MC" },
  { name: "Linear Algebra", code: "MATH2059", semester: 4, category: "SCI" },
  // Semester 5
  { name: "Cryptography and Network Security", code: "CSEG3040", semester: 5, category: "MC" },
  { name: "Formal Languages and Automata Theory", code: "CSEG3055", semester: 5, category: "MC" },
  { name: "Object Oriented Analysis and Design", code: "CSEG3002", semester: 5, category: "MC" },
  { name: "Start your Startup", code: "SLSG0205", semester: 5, category: "LSC" },
  { name: "Research Methodology in CS", code: "CSEG3060", semester: 5, category: "MC" },
  { name: "Probability, Entropy, and MC Simulation", code: "CSEG3056", semester: 5, category: "SCI" },
  // Semester 6
  { name: "Compiler Design", code: "CSEG3015", semester: 6, category: "MC" },
  { name: "Statistics and Data Analysis", code: "CSEG3057", semester: 6, category: "SCI" },
  { name: "Minor Project", code: "PROJ3154", semester: 6, category: "PRJ" },
  { name: "Leadership and Teamwork", code: "SLLS0103", semester: 6, category: "LSC" },
  // Semester 7
  { name: "Capstone Project - Phase 1", code: "PROJ4145", semester: 7, category: "PRJ" },
  { name: "Summer Internship", code: "SIIB4102", semester: 7, category: "PRJ" },
  // Semester 8
  { name: "Capstone Project - Phase 2", code: "PROJ4146", semester: 8, category: "PRJ" },
  { name: "IT Ethical Practices", code: "CSEG4038", semester: 8, category: "MC" },
  // CCVT Specialization
  { name: "Cloud Computing Fundamentals", code: "CSVT2010P", semester: 4, category: "CCVT" },
  { name: "Cloud Computing Architecture and Deployment Models", code: "CSVT3029P", semester: 5, category: "CCVT" },
  { name: "Containerization and DevOps", code: "CSDV3018P", semester: 6, category: "CCVT" },
  { name: "Containerization and DevOps Lab", code: "CSDV3118P", semester: 6, category: "CCVT" },
  { name: "Cloud Application Development", code: "CSVT4018P", semester: 7, category: "CCVT" },
  { name: "Cloud Computing Security and Management", code: "CSVT4019P", semester: 7, category: "CCVT" },
  // AIML Specialization
  { name: "Applied Machine Learning", code: "CSAI2016P", semester: 4, category: "AIML" },
  { name: "Deep Learning", code: "CSAI3025P", semester: 5, category: "AIML" },
  { name: "Deep Learning Lab", code: "CSAI3125P", semester: 5, category: "AIML" },
  { name: "Pattern and Visual Recognition", code: "CSAI3026P", semester: 6, category: "AIML" },
  { name: "Computational Linguistics and NLP", code: "CSEG4034P", semester: 7, category: "AIML" },
  { name: "Algorithm for Intelligent Systems and Robotics", code: "CSAI4013P", semester: 7, category: "AIML" },
  // DevOps Specialization
  { name: "DevOps Fundamentals and SCM", code: "CSDV2009P", semester: 4, category: "DevOps" },
  { name: "DevOps Fundamentals and SCM Lab", code: "CSDV2109P", semester: 4, category: "DevOps" },
  { name: "DevSecOps: Integrating Security into DevOps", code: "CSDV3022P", semester: 5, category: "DevOps" },
  { name: "DevSecOps Lab", code: "CSDV3122P", semester: 5, category: "DevOps" },
  { name: "Container Orchestration and Security", code: "CSDV3019P", semester: 6, category: "DevOps" },
  { name: "Container Orchestration and Security Lab", code: "CSDV3119P", semester: 6, category: "DevOps" },
  { name: "CICD Pipeline and Security", code: "CSDV4009P", semester: 7, category: "DevOps" },
  { name: "System Provisioning and Monitoring", code: "CSDV4010P", semester: 7, category: "DevOps" },
  // FSD Specialization
  { name: "Frontend Development", code: "CSFS2003P", semester: 4, category: "FSD" },
  { name: "Backend Development", code: "CSFS3005P", semester: 5, category: "FSD" },
  { name: "Microservices and Spring-Boot", code: "CSFS3007P", semester: 6, category: "FSD" },
  { name: "Cloud Computing and Security (FSD)", code: "CSVT4020P", semester: 7, category: "FSD" },
  // Cyber Security Specialization
  { name: "Information Technology and Cyber Security", code: "CSSF2014P", semester: 4, category: "CSDF" },
  { name: "Ethical Hacking & Penetration Testing", code: "CSSF3026P", semester: 5, category: "CSDF" },
  { name: "Network Security", code: "CSSF3027P", semester: 6, category: "CSDF" },
  { name: "Digital Forensics", code: "CSSF4015P", semester: 7, category: "CSDF" },
  { name: "OS, Application & Cloud Security", code: "CSSF4017P", semester: 7, category: "CSDF" },
  // Big Data Specialization
  { name: "Big Data Overview and Ingestion", code: "CSBD2010P", semester: 4, category: "BD" },
  { name: "Big Data Storage and Analysis", code: "CSBD3015P", semester: 5, category: "BD" },
  { name: "Big Data Processing - Disk based and In-Memory", code: "CSBD3016P", semester: 6, category: "BD" },
  { name: "Stream Processing", code: "CSBD4008P", semester: 7, category: "BD" },
  { name: "Big Data Search and Security", code: "CSBD4009P", semester: 7, category: "BD" },
  // Data Science Specialization
  { name: "Fundamentals of Data Science", code: "CSDS2001P", semester: 4, category: "DS" },
  { name: "Data Visualization and Interpretation", code: "CSDS3001P", semester: 5, category: "DS" },
  { name: "Machine Learning and Deep Learning", code: "CSDS3002P", semester: 6, category: "DS" },
  { name: "Generative Artificial Intelligence", code: "CSDS4001P", semester: 7, category: "DS" },
]

/* ─── Static data ─── */

const quickActions = [
  { label: "Upload Material", icon: Upload, href: "/dashboard/upload" },
  { label: "My Bookmarks", icon: Bookmark, href: "/dashboard/bookmarks" },
  { label: "View Analytics", icon: BarChart3, href: "/dashboard/analytics" },
]

/* ─── Component ─── */

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState("")
  // Use DB subjects if available, otherwise use embedded curriculum
  const [dbSubjects, setDbSubjects] = useState<any[] | null>(null)

  // Fetch real subjects from DB in background (for IDs and resource counts)
  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDbSubjects(data)
        }
      })
      .catch(() => {}) // Silently fail, embedded data will be used
  }, [])

  // Merge: prefer DB data (has IDs + resource counts), fallback to embedded
  const allSubjects = useMemo(() => {
    if (dbSubjects && dbSubjects.length > 0) {
      return dbSubjects.map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        semester: s.semesterNumber || 0,
        category: s.category || "",
        resourceCount: s.resourceCount || 0,
        credits: s.credits,
        hasDbId: true,
      }))
    }
    // Fallback to embedded curriculum (no DB IDs)
    return CURRICULUM_SUBJECTS.map((s, i) => ({
      id: `embedded-${i}`,
      name: s.name,
      code: s.code,
      semester: s.semester,
      category: s.category,
      resourceCount: 0,
      credits: 0,
      hasDbId: false,
    }))
  }, [dbSubjects])

  // Build semester summary from subjects
  const semesters = useMemo(() => {
    const grouped: Record<number, typeof allSubjects> = {}
    for (const s of allSubjects) {
      if (!grouped[s.semester]) grouped[s.semester] = []
      grouped[s.semester].push(s)
    }
    return Array.from({ length: 8 }, (_, i) => {
      const semNum = i + 1
      const semSubs = grouped[semNum] || []
      return {
        number: semNum,
        count: semSubs.length,
        searchValue: `Semester ${semNum} ${semSubs.map((s) => s.name).join(" ")} ${semSubs.map((s) => s.code).join(" ")}`,
        totalResources: semSubs.reduce((a, s) => a + s.resourceCount, 0),
      }
    })
  }, [allSubjects])

  // Fast client-side filtering — works on ALL subjects instantly
  const filteredSubjects = useMemo(() => {
    if (!searchInput || searchInput.length < 1) return allSubjects.slice(0, 20)

    const query = searchInput.toLowerCase()
    const queryWords = query.split(/\s+/).filter(Boolean)

    return allSubjects
      .filter((s) => {
        const name = s.name.toLowerCase()
        const code = s.code.toLowerCase()
        const category = s.category.toLowerCase()

        return queryWords.every(
          (word) =>
            name.includes(word) ||
            code.includes(word) ||
            category.includes(word)
        )
      })
      .slice(0, 30)
  }, [allSubjects, searchInput])

  // Track search — fire-and-forget, no local state, no events
  // AI recommendations are ONLY triggered on Smart Feed page via ?q= URL param
  const trackSearch = useCallback((query: string) => {
    if (!query || query.length < 2) return
    const normalizedQuery = query.toLowerCase().trim()
    // Fire-and-forget — does NOT block search or trigger AI
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

        {/* AI Smart Search */}
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

        {/* Subjects — always available instantly */}
        <CommandGroup heading={`Subjects (${filteredSubjects.length})`}>
          {filteredSubjects.map((subject) => (
            <CommandItem
              key={subject.id}
              value={`${subject.name} ${subject.code} ${subject.category} semester ${subject.semester}`}
              onSelect={() =>
                runCommand(
                  () => {
                    if (subject.hasDbId) {
                      router.push(`/dashboard/subjects/${subject.id}`)
                    } else {
                      // Fallback: go to subjects page with search
                      router.push(`/dashboard/subjects`)
                    }
                  },
                  subject.name
                )
              }
              className="gap-3 rounded-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <GraduationCap className="h-4 w-4 text-violet-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{subject.name}</span>
                <span className="text-xs text-muted-foreground">
                  {subject.code} • Sem {subject.semester}
                  {subject.category ? ` • ${subject.category}` : ""}
                  {subject.resourceCount > 0 ? ` • ${subject.resourceCount} resources` : ""}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Semesters */}
        <CommandGroup heading="Semesters">
          {semesters.map((sem) => (
            <CommandItem
              key={sem.number}
              value={sem.searchValue}
              onSelect={() =>
                runCommand(() => router.push(`/dashboard/semesters/${sem.number}`))
              }
              className="gap-3 rounded-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Semester {sem.number}</span>
                <span className="text-xs text-muted-foreground">
                  {sem.count} subjects • {sem.totalResources} resources
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      {/* Footer */}
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
