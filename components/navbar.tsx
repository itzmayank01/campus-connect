"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">CC</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground font-mono">
            Campus Connect
          </span>
        </Link>

        {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-6">
       <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        Features
       </Link>

        <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          How It Works
        </Link>

        <Link href="#stats" className="text-sm font-medium text-muted-foreground hover:text-foreground">
        Stats
        </Link>
      </div>

       <div className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>

          <Link href="/login">
            <Button size="sm">
              Get Started
            </Button>
          </Link>
      </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-foreground"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="#stats"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Stats
            </Link>
            <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
          
          <Link href="/login">
            <Button variant="ghost" size="sm" className="justify-start text-muted-foreground">
              Login
            </Button>
          </Link>

          <Link href="/login">
            <Button size="sm">
              Get Started
            </Button>
          </Link>

            </div>
          </div>
        </div>
      )}
    </header>
  )
}
