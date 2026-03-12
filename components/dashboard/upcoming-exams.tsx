import { CalendarDays } from "lucide-react"

const exams = [
  {
    subject: "Data Structures",
    date: "12 June",
    daysLeft: 3,
  },
  {
    subject: "DBMS",
    date: "18 June",
    daysLeft: 9,
  },
  {
    subject: "Operating Systems",
    date: "22 June",
    daysLeft: 13,
  },
  {
    subject: "Computer Networks",
    date: "28 June",
    daysLeft: 19,
  },
]

function getDaysLeftStyle(days: number) {
  if (days <= 3) return "bg-red-100 text-red-700"
  if (days <= 10) return "bg-amber-100 text-amber-700"
  return "bg-emerald-100 text-emerald-700"
}

function getDotColor(days: number) {
  if (days <= 3) return "bg-red-500"
  if (days <= 10) return "bg-amber-500"
  return "bg-emerald-500"
}

export function UpcomingExams() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Upcoming Exams</h2>
      </div>
      <div className="space-y-3.5">
        {exams.map((exam) => (
          <div key={exam.subject} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`h-2 w-2 shrink-0 rounded-full ${getDotColor(exam.daysLeft)}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{exam.subject}</p>
                <p className="text-[11px] text-muted-foreground">{exam.date}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getDaysLeftStyle(exam.daysLeft)}`}>
              {exam.daysLeft} days left
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
