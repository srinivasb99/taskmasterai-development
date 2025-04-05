import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function LandingHero() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Master Your Productivity with AI</h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-10">
          TaskMaster AI is the all-in-one productivity tool designed for students and professionals. Manage tasks, track
          goals, and optimize your time with intelligent assistance.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              View Demo
            </Button>
          </Link>
        </div>

        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10 h-20 bottom-0 top-auto"></div>
          <div className="rounded-lg border border-zinc-800 overflow-hidden shadow-2xl">
            <img src="/placeholder.svg?height=600&width=1200" alt="TaskMaster AI Dashboard" className="w-full h-auto" />
          </div>
        </div>
      </div>
    </section>
  )
}

