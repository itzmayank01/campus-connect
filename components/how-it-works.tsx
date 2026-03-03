import { Upload, FolderKanban, Sparkles } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Resources",
    description:
      "Students and mentors upload study materials, notes, and past papers to the platform with a simple drag-and-drop interface.",
  },
  {
    number: "02",
    icon: FolderKanban,
    title: "Smart Categorization",
    description:
      "Our AI automatically categorizes and tags resources by semester, subject, topic, and difficulty level for easy discovery.",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Personalized Recommendations",
    description:
      "Receive tailored study material suggestions based on your enrolled courses, learning history, and upcoming exams.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-secondary/50 px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            How It Works
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three simple steps to smarter learning
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Getting started takes less than a minute. Here is how Campus Connect
            transforms your study experience.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.title} className="relative flex flex-col items-center text-center">
              {/* Connector line on desktop */}
              {idx < steps.length - 1 && (
                <div className="absolute right-0 top-12 hidden h-px w-full translate-x-1/2 bg-border md:block" />
              )}

              <div className="relative mb-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                  <step.icon className="h-10 w-10 text-primary" />
                </div>
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md">
                  {step.number}
                </span>
              </div>

              <h3 className="mb-3 text-xl font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="max-w-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
