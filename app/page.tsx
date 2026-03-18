import { ProblemSection } from "@/components/problem-section"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import dynamic from "next/dynamic"

const Features = dynamic(() => import("@/components/features").then(m => ({ default: m.Features })), {
  loading: () => <div className="py-20" />,
})
const HowItWorks = dynamic(() => import("@/components/how-it-works").then(m => ({ default: m.HowItWorks })), {
  loading: () => <div className="py-20" />,
})
const Statistics = dynamic(() => import("@/components/statistics").then(m => ({ default: m.Statistics })), {
  loading: () => <div className="py-20" />,
})
const CallToAction = dynamic(() => import("@/components/call-to-action").then(m => ({ default: m.CallToAction })), {
  loading: () => <div className="py-20" />,
})
const Footer = dynamic(() => import("@/components/footer").then(m => ({ default: m.Footer })), {
  loading: () => <div className="py-12" />,
})

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ProblemSection />
        <Features />
        <HowItWorks />
        <Statistics />
        <CallToAction />
      </main>
      <Footer />
    </div>
  )
}
