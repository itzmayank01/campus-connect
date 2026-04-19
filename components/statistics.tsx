"use client"

import { useEffect, useRef, useState } from "react"

const stats = [
  { value: 500, suffix: "+", label: "Resources" },
  { value: 200, suffix: "+", label: "Students" },
  { value: 50, suffix: "+", label: "Mentors" },
]

function AnimatedNumber({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 1500
          const start = performance.now()

          function tick(now: number) {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(tick)
          }

          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <div ref={ref} className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
      {count}
      {suffix}
    </div>
  )
}

export function Statistics() {
  return (
    <section id="stats" className="py-20 w-full lg:py-28">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 md:px-8">
        <div className="grid gap-12 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              <p className="mt-3 text-lg font-medium text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
