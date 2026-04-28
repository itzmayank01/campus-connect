"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface StudyCalendarProps {
  semesters: any[]
  userSemester?: number | null
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export function StudyCalendar({ semesters, userSemester }: StudyCalendarProps) {
  const router = useRouter()
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDateStr, setSelectedDateStr] = useState("")
  const [selectedTimeStr, setSelectedTimeStr] = useState("10:00")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [examName, setExamName] = useState("")
  const [examType, setExamType] = useState("endterm")
  const [selectedSubject, setSelectedSubject] = useState("")

  // Calendar logic
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const { days, blanks } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    return {
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      blanks: Array.from({ length: firstDay }, (_, i) => i)
    }
  }, [year, month])

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const handleDayClick = (day: number) => {
    // Format to YYYY-MM-DD
    const clickedDate = new Date(year, month, day)
    // Only allow scheduling exams from today onwards (or maybe allow past for testing, but let's just prefill)
    const formatted = `${clickedDate.getFullYear()}-${String(clickedDate.getMonth() + 1).padStart(2, '0')}-${String(clickedDate.getDate()).padStart(2, '0')}`
    setSelectedDateStr(formatted)
    setIsModalOpen(true)
  }

  // Flatten subjects for the dropdown
  const allSubjects = useMemo(() => {
    const subjects: any[] = []
    semesters.forEach(sem => {
      // If userSemester is provided, only include subjects from that semester
      if (userSemester && sem.number !== userSemester) return;
      
      sem.subjects?.forEach((sub: any) => {
        subjects.push({ ...sub, semesterId: sem.id || sem.number }) // fallback to number if id missing
      })
    })
    return subjects
  }, [semesters, userSemester])

  const handleScheduleExam = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!examName || !selectedSubject || !selectedDateStr) {
      toast.error("Please fill in all required fields")
      return
    }

    const subject = allSubjects.find(s => s.id === selectedSubject)
    if (!subject) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: examName,
          subjectId: subject.id,
          semesterId: subject.semesterId, // Assuming api expects this
          date: `${selectedDateStr}T${selectedTimeStr}:00`,
          type: examType
        })
      })

      if (!res.ok) {
        throw new Error("Failed to schedule exam")
      }

      toast.success("Exam scheduled successfully!")
      setIsModalOpen(false)
      // Reset form
      setExamName("")
      setExamType("endterm")
      setSelectedSubject("")
      setSelectedTimeStr("10:00")
      
      // Refresh the dashboard to show new exam
      router.refresh()
    } catch (error) {
      toast.error("Could not schedule exam. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#0F1117] font-display">
              {MONTHS[month]} {year}
            </h2>
            <p className="text-sm text-[#6B7280] mt-0.5">Plan your study schedule</p>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0F1117] transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0F1117] transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(day => (
            <div key={day} className="text-center text-[11px] font-semibold text-[#6B7280]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
          {blanks.map(blank => (
            <div key={`blank-${blank}`} className="h-8" />
          ))}
          {days.map(day => {
            const todayMatch = isToday(day)
            return (
              <div key={day} className="flex justify-center">
                <button
                  onClick={() => handleDayClick(day)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
                    todayMatch 
                      ? "bg-[#4F8EF7] text-white shadow-md shadow-[#4F8EF7]/30" 
                      : "text-[#374151] hover:bg-[#F3F4F6]"
                  }`}
                >
                  {day}
                </button>
              </div>
            )
          })}
        </div>
        
        {/* Quick Add Button */}
        <div className="mt-5 pt-4 border-t border-[rgba(0,0,0,0.06)]">
          <Button 
            onClick={() => {
              const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
              setSelectedDateStr(formatted)
              setIsModalOpen(true)
            }}
            variant="outline" 
            className="w-full justify-center gap-2 text-[#4F8EF7] hover:text-[#3B7AE0] hover:bg-[#4F8EF7]/5 border-[#4F8EF7]/20"
          >
            <Plus className="h-4 w-4" />
            Add Exam
          </Button>
        </div>
      </div>

      {/* Add Exam Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule Exam</DialogTitle>
            <DialogDescription>
              Add a new exam to your schedule. It will appear on your dashboard.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleScheduleExam} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="examName">Exam Title</Label>
              <Input 
                id="examName" 
                placeholder="e.g. Data Structures Midterm" 
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {allSubjects.length > 0 ? (
                    allSubjects.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500 text-center">No subjects available</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examDate">Date</Label>
                <Input 
                  id="examDate" 
                  type="date" 
                  value={selectedDateStr}
                  onChange={(e) => setSelectedDateStr(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="examTime">Time</Label>
                <Input 
                  id="examTime" 
                  type="time" 
                  value={selectedTimeStr}
                  onChange={(e) => setSelectedTimeStr(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="examType">Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="midterm">Midterm</SelectItem>
                  <SelectItem value="endterm">Endterm</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#4F8EF7] hover:bg-[#3B7AE0]">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
