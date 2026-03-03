import { Brain, Zap, Shield } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Brain,
    title: "AI-Based Recommendations",
    description:
      "Our intelligent engine analyzes your learning patterns and course requirements to surface the most relevant study materials tailored to your semester and subjects.",
  },
  {
    icon: Zap,
    title: "High-Speed Redis Caching",
    description:
      "Experience lightning-fast load times powered by Redis caching. Frequently accessed resources are served instantly, even during peak usage hours.",
  },
  {
    icon: Shield,
    title: "Secure Cloud Infrastructure",
    description:
      "Built on AWS with enterprise-grade security. Your data is encrypted, backed up, and served through a globally distributed network for maximum reliability.",
  },
]

export function Features() {
  return (
    <section id="features" className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to excel
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            A comprehensive toolkit designed for engineering students, powered by
            cutting-edge technology.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardContent className="flex flex-col gap-4 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground">
                  {feature.title}
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
