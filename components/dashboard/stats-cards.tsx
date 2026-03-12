import { FileText, BookOpen, Users, FolderOpen } from "lucide-react"

const stats = [
  {
    title: "Total Resources",
    value: "532+",
    change: "↑ 120 New",
    icon: FolderOpen,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    changeColor: "text-blue-600",
  },
  {
    title: "Subjects",
    value: "24",
    change: "CSE • ECE • ME",
    icon: BookOpen,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    changeColor: "text-emerald-600",
  },
  {
    title: "Notes & PDFs",
    value: "1.2k+",
    change: "Across all semesters",
    icon: FileText,
    color: "text-violet-600",
    bgColor: "bg-violet-100",
    changeColor: "text-muted-foreground",
  },
]

export function StatsCards() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
              <p className={`text-xs font-medium ${stat.changeColor}`}>{stat.change}</p>
            </div>
            <div className={`rounded-xl p-2.5 ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
