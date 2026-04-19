import Link from "next/link"
import { Github, Linkedin } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-8 px-4 sm:px-6 md:px-8 md:flex-row md:justify-between">
        {/* Logo & copyright */}
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">CC</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground font-mono">
              Campus Connect
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Smarter learning for engineering students.
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center gap-8">
          <Link
            href="#"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="#"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </Link>
          <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </Link>
          <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-8 w-full max-w-[1600px] border-t border-border px-4 sm:px-6 md:px-8 pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Campus Connect. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
