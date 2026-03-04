import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navbar */}
      <header className="w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">CC</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground font-mono">
              Campus Connect
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </nav>
      </header>

      {/* Centered Login Card */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        {/* Subtle background dot pattern */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <LoginForm />
      </main>
    </div>
  )
}
