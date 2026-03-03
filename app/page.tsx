import { ProblemSection } from "@/components/problem-section"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { Statistics } from "@/components/statistics"
import { CallToAction } from "@/components/call-to-action"
import { Footer } from "@/components/footer"

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
