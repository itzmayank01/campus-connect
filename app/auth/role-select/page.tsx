"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Check } from "lucide-react"

type RoleType = "student" | "faculty" | null

export default function RoleSelectPage() {
  const [role, setRole] = useState<RoleType>(null)
  const [facultyId, setFacultyId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleComplete = async () => {
    setError(null)

    if (!role) {
      setError("Please select Student or Faculty")
      return
    }

    if (role === "faculty" && !facultyId.trim()) {
      setError("Please enter your Employee / Faculty ID")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, facultyId: role === "faculty" ? facultyId : null }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Something went wrong")
        setLoading(false)
        return
      }

      if (role === "faculty") {
        router.push("/faculty/dashboard")
      } else {
        router.push("/dashboard")
      }
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md">
      <div className="w-full max-w-[480px] mx-4 rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-2 text-center mb-8">
          <span className="text-4xl">👋</span>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1117]">
            Welcome! One last step
          </h1>
          <p className="text-sm text-[#64748B]">
            Tell us who you are to personalize your experience
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Student Card */}
          <button
            type="button"
            onClick={() => { setRole("student"); setError(null) }}
            disabled={loading}
            className={`relative flex flex-col items-center gap-2 rounded-2xl p-5 transition-all duration-200 cursor-pointer border-[1.5px] ${
              role === "student"
                ? "border-[#4F8EF7] shadow-[0_0_0_4px_rgba(79,142,247,0.1)]"
                : "border-[#E2E8F0] hover:border-[#CBD5E1]"
            }`}
            style={{
              background: role === "student"
                ? "linear-gradient(135deg, #EFF6FF, #DBEAFE)"
                : "#F8FAFC",
            }}
          >
            {role === "student" && (
              <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4F8EF7]">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
            )}
            <span className="text-[32px]">🎓</span>
            <span className={`text-[15px] font-semibold ${
              role === "student" ? "text-[#1E40AF]" : "text-[#94A3B8]"
            }`}>Student</span>
            <span className={`text-[11px] text-center leading-tight ${
              role === "student" ? "text-[#3B82F6]" : "text-[#CBD5E1]"
            }`}>Browse and upload<br />study materials</span>
          </button>

          {/* Faculty Card */}
          <button
            type="button"
            onClick={() => { setRole("faculty"); setError(null) }}
            disabled={loading}
            className={`relative flex flex-col items-center gap-2 rounded-2xl p-5 transition-all duration-200 cursor-pointer border-[1.5px] ${
              role === "faculty"
                ? "border-[#22C55E] shadow-[0_0_0_4px_rgba(34,197,94,0.1)]"
                : "border-[#E2E8F0] hover:border-[#CBD5E1]"
            }`}
            style={{
              background: role === "faculty"
                ? "linear-gradient(135deg, #F0FDF4, #DCFCE7)"
                : "#F8FAFC",
            }}
          >
            {role === "faculty" && (
              <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E]">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </div>
            )}
            <span className="text-[32px]">👨‍🏫</span>
            <span className={`text-[15px] font-semibold ${
              role === "faculty" ? "text-[#15803D]" : "text-[#94A3B8]"
            }`}>Faculty</span>
            <span className={`text-[11px] text-center leading-tight ${
              role === "faculty" ? "text-[#22C55E]" : "text-[#CBD5E1]"
            }`}>Upload, manage<br />and verify notes</span>
          </button>
        </div>

        {/* Faculty ID Field */}
        <div
          className="overflow-hidden transition-all duration-[250ms] ease-out mb-6"
          style={{
            maxHeight: role === "faculty" ? "100px" : "0px",
            opacity: role === "faculty" ? 1 : 0,
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="facultyId" className="text-sm font-medium text-[#0F1117]">
              Employee / Faculty ID
            </Label>
            <Input
              id="facultyId"
              type="text"
              placeholder="Enter your employee ID"
              className="h-11 rounded-xl bg-[#F8FAFC]"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <Button
          onClick={handleComplete}
          disabled={loading || !role}
          className="w-full h-12 rounded-xl text-base font-semibold"
          style={{
            background: role === "faculty"
              ? "linear-gradient(135deg, #22C55E, #16A34A)"
              : undefined,
          }}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            "Complete Setup →"
          )}
        </Button>
      </div>
    </div>
  )
}
