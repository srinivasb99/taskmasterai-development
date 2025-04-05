import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DemoOverview } from "@/components/demo/demo-overview"
import { DemoTasks } from "@/components/demo/demo-tasks"
import { DemoTimers } from "@/components/demo/demo-timers"
import { DemoCalendar } from "@/components/demo/demo-calendar"

export const metadata: Metadata = {
  title: "Interactive Demo | TaskMaster AI",
  description: "Try TaskMaster AI's features before signing up",
}

export default function DemoPage() {
  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Interactive Demo</h1>
          <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
            Experience TaskMaster AI's features before signing up. This demo showcases our core functionality.
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 md:p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
                <span className="font-bold text-white">T</span>
              </div>
              <span className="font-bold text-xl">TaskMaster AI</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/signup">
                <Button>Sign Up Now</Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <DemoOverview className="col-span-1 lg:col-span-2" />
            <DemoTimers />
            <DemoTasks className="col-span-1 lg:col-span-2" />
            <DemoCalendar />
          </div>
        </div>

        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold mb-4">Ready to boost your productivity?</h2>
          <p className="text-zinc-400 mb-6 max-w-2xl mx-auto">
            Sign up now to access all features and start achieving your goals more efficiently.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Create Free Account
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

