"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen, FlaskConical, Code2, GraduationCap, PenTool,
  Check, Plus, X, Activity, Sparkles, Calendar, Target, Trash2
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Goal {
  id: number
  time: string
  text: string
  iconName: string
  color: string
  completed: boolean
}

interface DayGoals {
  [dateKey: string]: Goal[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, FlaskConical, Code2, GraduationCap, PenTool, Activity, Target
}

const ICON_OPTIONS = [
  { name: "BookOpen", icon: BookOpen, label: "Reading" },
  { name: "FlaskConical", icon: FlaskConical, label: "Lab" },
  { name: "Code2", icon: Code2, label: "Coding" },
  { name: "GraduationCap", icon: GraduationCap, label: "Study" },
  { name: "PenTool", icon: PenTool, label: "Writing" },
  { name: "Activity", icon: Activity, label: "Activity" },
  { name: "Target", icon: Target, label: "Goal" },
]

const GRADIENT_COLORS = [
  "from-[#FF7E5F] to-[#FEB47B]",
  "from-[#8A2387] to-[#E94057]",
  "from-[#4776E6] to-[#8E54E9]",
  "from-[#00C9FF] to-[#92FE9D]",
  "from-[#11998e] to-[#38ef7d]",
  "from-[#FC466B] to-[#3F5EFB]",
  "from-[#f7971e] to-[#ffd200]",
]

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DOT_COLORS = [
  "bg-orange-400", "bg-rose-400", "bg-purple-400",
  "bg-sky-400", "bg-emerald-400", "bg-amber-400", "bg-pink-400"
]

const STORAGE_KEY = "campus-connect-daily-goals"

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getUpcomingDays(today: Date, count: number = 14): Date[] {
  const days: Date[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }
  return days
}

function loadGoals(): DayGoals {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveGoals(goals: DayGoals) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch {
    // Ignore quota errors
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function DailyGoals() {
  const today = useMemo(() => new Date(), [])
  const todayKey = useMemo(() => getDateKey(today), [today])
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey)
  
  const upcomingDays = useMemo(() => {
    const days = getUpcomingDays(today, 14)
    // Ensure selectedDateKey is in the list if it's outside the 14 days
    if (!days.find(d => getDateKey(d) === selectedDateKey)) {
      const [y, m, d] = selectedDateKey.split("-").map(Number)
      days.unshift(new Date(y, m - 1, d))
    }
    return days.sort((a, b) => a.getTime() - b.getTime())
  }, [today, selectedDateKey])

  const [allGoals, setAllGoals] = useState<DayGoals>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newGoalText, setNewGoalText] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("Activity")
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load goals from localStorage on mount
  useEffect(() => {
    setAllGoals(loadGoals())
    setMounted(true)
  }, [])

  // Persist whenever allGoals changes (after mount)
  useEffect(() => {
    if (mounted) {
      saveGoals(allGoals)
    }
  }, [allGoals, mounted])

  const currentGoals = useMemo(
    () => allGoals[selectedDateKey] || [],
    [allGoals, selectedDateKey]
  )

  const completedCount = currentGoals.filter(g => g.completed).length
  const totalCount = currentGoals.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const handleAddGoal = useCallback(() => {
    if (newGoalText.trim()) {
      const newGoal: Goal = {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
        text: newGoalText.trim(),
        iconName: selectedIcon,
        color: GRADIENT_COLORS[Math.floor(Math.random() * GRADIENT_COLORS.length)],
        completed: false,
      }
      setAllGoals(prev => ({
        ...prev,
        [selectedDateKey]: [...(prev[selectedDateKey] || []), newGoal],
      }))
      setNewGoalText("")
      setSelectedIcon("Activity")
      setIsAdding(false)
    }
  }, [newGoalText, selectedIcon, selectedDateKey])

  const toggleGoal = useCallback((id: number) => {
    setAllGoals(prev => ({
      ...prev,
      [selectedDateKey]: (prev[selectedDateKey] || []).map(g =>
        g.id === id ? { ...g, completed: !g.completed } : g
      ),
    }))
  }, [selectedDateKey])

  const removeGoal = useCallback((id: number) => {
    setAllGoals(prev => ({
      ...prev,
      [selectedDateKey]: (prev[selectedDateKey] || []).filter(g => g.id !== id),
    }))
  }, [selectedDateKey])

  // Selected date info for subtitle
  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedDateKey.split("-").map(Number)
    return new Date(y, m - 1, d)
  }, [selectedDateKey])

  const isToday = selectedDateKey === todayKey
  const isFuture = selectedDate > today

  const dateLabel = isToday
    ? "Today"
    : selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })

  return (
    <div id="daily-goals" className="relative rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-[#F1F5F9]">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#E0E7FF] to-[#F3E8FF] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#E0F2FE] to-[#E0E7FF] rounded-full blur-2xl opacity-50 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C9FF] to-[#4facfe] flex items-center justify-center shadow-md shadow-[#00C9FF]/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-widest text-[#0F1117] uppercase font-display">
                {MONTH_NAMES[today.getMonth()]} {today.getFullYear()}
              </h2>
              <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
                {dateLabel} — {totalCount === 0 ? "No goals set" : `${completedCount}/${totalCount} completed`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-[#F8FAFC] rounded-full px-3 py-1.5 border border-[#E2E8F0]"
              >
                <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#00C9FF] to-[#4facfe]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs font-bold text-[#64748B]">{Math.round(progress)}%</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center mb-8 gap-2 overflow-x-auto hide-scrollbar pb-2">
          <div className="flex items-center gap-2 flex-1 min-w-max">
          {upcomingDays.map((d, i) => {
            const key = getDateKey(d)
            const isActive = key === selectedDateKey
            const dayGoals = allGoals[key] || []
            const hasGoals = dayGoals.length > 0
            const dayCompleted = dayGoals.length > 0 && dayGoals.every(g => g.completed)
            const isCurrentDay = key === todayKey

            return (
              <motion.button
                key={key}
                onClick={() => setSelectedDateKey(key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex flex-col items-center justify-center w-[calc(20%-8px)] min-w-[70px] h-20 rounded-2xl transition-all duration-300 shrink-0 ${
                  isActive
                    ? "bg-gradient-to-br from-[#00C9FF] to-[#4facfe] shadow-lg shadow-[#00C9FF]/30 text-white transform scale-105"
                    : "text-[#64748B] hover:bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0]"
                }`}
              >
                {isCurrentDay && !isActive && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#00C9FF] bg-[#E0F7FF] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Today
                  </span>
                )}
                <span className={`text-lg font-bold ${isActive ? "text-white" : "text-[#0F1117]"}`}>
                  {d.getDate()}
                </span>
                <span className={`text-xs font-medium mt-0.5 ${isActive ? "text-white/90" : "text-[#94A3B8]"}`}>
                  {DAY_NAMES[d.getDay()]}
                </span>
                <div className="mt-1.5 flex items-center gap-0.5">
                  {hasGoals ? (
                    dayCompleted ? (
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : "bg-emerald-400"}`} />
                    ) : (
                      <>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/80" : DOT_COLORS[i % DOT_COLORS.length]}`} />
                        <span className={`text-[9px] font-bold ${isActive ? "text-white/70" : "text-[#94A3B8]"}`}>
                          {dayGoals.length}
                        </span>
                      </>
                    )
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/40" : "bg-[#E2E8F0]"}`} />
                  )}
                </div>
              </motion.button>
            )
          })}
          </div>
          
          <div className="relative shrink-0 ml-2">
            <input
              type="date"
              value={selectedDateKey}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDateKey(e.target.value)
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Select any date"
            />
            <div className="w-12 h-20 rounded-2xl border border-dashed border-[#CBD5E1] flex flex-col items-center justify-center text-[#94A3B8] hover:bg-[#F8FAFC] transition-colors hover:text-[#64748B] hover:border-[#94A3B8] cursor-pointer">
              <Calendar className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-semibold uppercase">More</span>
            </div>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-3 min-h-[120px]">
          <AnimatePresence mode="wait">
            {currentGoals.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-[#94A3B8]" />
                </div>
                <p className="text-sm font-semibold text-[#64748B] mb-1">
                  {isFuture ? "Plan ahead!" : "No goals for this day"}
                </p>
                <p className="text-xs text-[#94A3B8] max-w-[240px]">
                  {isFuture
                    ? "Set your goals in advance to stay organized and productive."
                    : "Tap the + button below to add your study goals."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedDateKey}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {currentGoals.map((goal, index) => {
                  const IconComponent = ICON_MAP[goal.iconName] || Activity
                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 group"
                    >
                      {/* Time */}
                      <div className="w-12 text-right shrink-0">
                        <span className={`text-[13px] font-bold ${goal.completed ? "text-[#CBD5E1]" : "text-[#334155]"}`}>
                          {goal.time}
                        </span>
                      </div>

                      {/* Goal Card */}
                      <div
                        className={`flex-1 flex items-center justify-between rounded-2xl p-3 transition-all border ${
                          goal.completed
                            ? "bg-[#F8FAFC] border-[#E2E8F0] opacity-60"
                            : "bg-white border-[#F8FAFC] shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] group-hover:border-[#E2E8F0]"
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${goal.color} flex items-center justify-center shrink-0 shadow-inner ${goal.completed ? "opacity-50" : ""}`}>
                            <IconComponent className="w-4 h-4 text-white" strokeWidth={2.5} />
                          </div>
                          <p className={`text-[14px] font-semibold truncate ${goal.completed ? "line-through text-[#94A3B8]" : "text-[#1E293B]"}`}>
                            {goal.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {/* Complete toggle */}
                          <button
                            onClick={() => toggleGoal(goal.id)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              goal.completed
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                                : "bg-[#F1F5F9] text-[#94A3B8] opacity-0 group-hover:opacity-100 hover:bg-emerald-500 hover:text-white"
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => removeGoal(goal.id)}
                            className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-[#EF4444] hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Goal Section */}
        <div className="mt-8 flex justify-center">
          <AnimatePresence mode="wait">
            {isAdding ? (
              <motion.div
                key="add-form"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="w-full max-w-md space-y-3"
              >
                {/* Icon Picker */}
                <div className="flex items-center gap-1 justify-center">
                  {ICON_OPTIONS.map(opt => {
                    const isSelected = selectedIcon === opt.name
                    return (
                      <button
                        key={opt.name}
                        onClick={() => setSelectedIcon(opt.name)}
                        title={opt.label}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-gradient-to-br from-[#00C9FF] to-[#4facfe] text-white shadow-md shadow-[#00C9FF]/30 scale-110"
                            : "bg-[#F1F5F9] text-[#94A3B8] hover:bg-[#E2E8F0] hover:text-[#64748B]"
                        }`}
                      >
                        <opt.icon className="w-4 h-4" strokeWidth={2} />
                      </button>
                    )
                  })}
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-full shadow-lg border border-[#E2E8F0]">
                  <input
                    type="text"
                    autoFocus
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                    placeholder={`Add goal for ${dateLabel.toLowerCase()}...`}
                    className="flex-1 bg-transparent px-4 text-sm font-medium text-[#1E293B] outline-none placeholder:text-[#CBD5E1]"
                  />
                  <button
                    onClick={() => { setIsAdding(false); setNewGoalText(""); }}
                    className="w-8 h-8 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleAddGoal}
                    disabled={!newGoalText.trim()}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00C9FF] to-[#4facfe] text-white flex items-center justify-center shadow-md disabled:opacity-40 disabled:shadow-none transition-opacity"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="add-btn"
                onClick={() => setIsAdding(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00C9FF] to-[#4facfe] text-white shadow-lg shadow-[#00C9FF]/40 flex items-center justify-center"
              >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Day summary footer */}
        {totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                {currentGoals.slice(0, 3).map((g, i) => (
                  <div
                    key={g.id}
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${g.color} border-2 border-white flex items-center justify-center`}
                    style={{ zIndex: 3 - i }}
                  >
                    {g.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                ))}
                {totalCount > 3 && (
                  <div className="w-6 h-6 rounded-full bg-[#F1F5F9] border-2 border-white flex items-center justify-center text-[9px] font-bold text-[#64748B]">
                    +{totalCount - 3}
                  </div>
                )}
              </div>
              <span className="text-xs text-[#94A3B8] font-medium">
                {completedCount === totalCount
                  ? "🎉 All goals completed!"
                  : `${totalCount - completedCount} remaining`}
              </span>
            </div>
            {completedCount === totalCount && totalCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-lg"
              >
                ⭐
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}
