"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, CheckCircle2, GraduationCap, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type RoleType = "student" | "faculty" | null

export function SignupForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<RoleType>(null)
  const [facultyId, setFacultyId] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setRoleError(false)

    if (!role) {
      setRoleError(true)
      setError("Please select Student or Faculty")
      return
    }

    if (role === "faculty" && !facultyId.trim()) {
      setError("Please enter your Employee / Faculty ID")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          faculty_id: role === "faculty" ? facultyId : null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-8 shadow-lg shadow-primary/5">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Click the link in your email to verify your account.
          </p>
          <Button
            variant="outline"
            className="mt-2 rounded-xl"
            onClick={() => router.push("/login")}
          >
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-8 shadow-lg shadow-primary/5">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Join Campus Connect to get started
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleEmailSignup}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            className="h-11 rounded-xl bg-background"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading || googleLoading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@university.edu"
            className="h-11 rounded-xl bg-background"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || googleLoading}
          />
        </div>

        {/* Role Selector */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">
            I am a...
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {/* Student Card */}
            <button
              type="button"
              onClick={() => { setRole("student"); setRoleError(false); setError(null) }}
              disabled={loading || googleLoading}
              className={`relative flex flex-col items-center gap-2 rounded-2xl p-5 transition-all duration-200 cursor-pointer border-[1.5px] ${
                roleError && !role
                  ? "border-red-400 animate-[shake_0.3s_ease-in-out]"
                  : role === "student"
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
              }`}>
                Student
              </span>
              <span className={`text-[11px] text-center leading-tight ${
                role === "student" ? "text-[#3B82F6]" : "text-[#CBD5E1]"
              }`}>
                Browse and upload<br />study materials
              </span>
            </button>

            {/* Faculty Card */}
            <button
              type="button"
              onClick={() => { setRole("faculty"); setRoleError(false); setError(null) }}
              disabled={loading || googleLoading}
              className={`relative flex flex-col items-center gap-2 rounded-2xl p-5 transition-all duration-200 cursor-pointer border-[1.5px] ${
                roleError && !role
                  ? "border-red-400 animate-[shake_0.3s_ease-in-out]"
                  : role === "faculty"
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
              }`}>
                Faculty
              </span>
              <span className={`text-[11px] text-center leading-tight ${
                role === "faculty" ? "text-[#22C55E]" : "text-[#CBD5E1]"
              }`}>
                Upload, manage<br />and verify notes
              </span>
            </button>
          </div>
        </div>

        {/* Faculty ID Field - slides in when faculty selected */}
        <div
          className="overflow-hidden transition-all duration-[250ms] ease-out"
          style={{
            maxHeight: role === "faculty" ? "100px" : "0px",
            opacity: role === "faculty" ? 1 : 0,
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="facultyId" className="text-sm font-medium text-foreground">
              Employee / Faculty ID
            </Label>
            <Input
              id="facultyId"
              type="text"
              placeholder="Enter your employee ID"
              className="h-11 rounded-xl bg-background"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              disabled={loading || googleLoading}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password (min. 6 characters)"
              className="h-11 rounded-xl bg-background pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading || googleLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="mt-1 h-11 rounded-xl text-base font-medium"
          disabled={loading || googleLoading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>

        <div className="relative flex items-center gap-4 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 rounded-xl text-base font-medium gap-3"
          onClick={handleGoogleSignup}
          disabled={loading || googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continue with Google
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>

      {/* Shake animation keyframes */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}
