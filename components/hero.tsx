import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-10 pb-20 lg:pt-16 lg:pb-32">
      {/* Subtle background dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-14 lg:flex-row lg:items-center lg:gap-20">
        {/* Left content */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
            AI-Powered Academic Platform
          </div>

          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Smarter Academic Resource Platform for{" "}
            <span className="text-primary">Engineers</span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Harness AI-driven recommendations, semester-wise study materials, and
            secure cloud infrastructure to accelerate your engineering journey.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/login">
              <Button size="lg">
                Get Started →
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 text-base">
              Learn More
            </Button>
          </div>
        </div>

        {/* Right mockup */}
        <div className="flex-1">
          <div className="relative rounded-2xl border border-border bg-card p-2 shadow-xl shadow-primary/5">
            <Image
              src="/images/dashboard-mockup.jpg"
              alt="Campus Connect dashboard showing study materials and analytics"
              width={960}
              height={640}
              className="w-full h-auto object-cover rounded-xl"
              priority
              fetchPriority="high"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
