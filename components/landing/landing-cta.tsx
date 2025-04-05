import Link from "next/link"
import { Button } from "@/components/ui/button"

export function LandingCta() {
  return (
    <section id="pricing" className="py-20 bg-zinc-950">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Boost Your Productivity?</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto mb-10">
          Join TaskMaster AI today and start achieving your goals more efficiently. Free for students, affordable for
          everyone else.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
            <h3 className="text-xl font-bold mb-2">Free</h3>
            <p className="text-3xl font-bold mb-6">$0</p>
            <ul className="space-y-3 text-left mb-8">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Basic task management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Simple Pomodoro timer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Calendar view</span>
              </li>
            </ul>
            <Link href="/signup">
              <Button variant="outline" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 relative md:scale-105 md:-my-4 shadow-lg">
            <div className="absolute -top-3 left-0 right-0 mx-auto w-fit px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium">
              Most Popular
            </div>
            <h3 className="text-xl font-bold mb-2">Student</h3>
            <p className="text-3xl font-bold mb-6">
              $4.99<span className="text-sm font-normal text-zinc-400">/month</span>
            </p>
            <ul className="space-y-3 text-left mb-8">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Advanced task management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Multiple Pomodoro timers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>AI productivity assistant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Group chat & collaboration</span>
              </li>
            </ul>
            <Link href="/signup">
              <Button className="w-full">Get Started</Button>
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8">
            <h3 className="text-xl font-bold mb-2">Professional</h3>
            <p className="text-3xl font-bold mb-6">
              $9.99<span className="text-sm font-normal text-zinc-400">/month</span>
            </p>
            <ul className="space-y-3 text-left mb-8">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Everything in Student</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Advanced analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>API integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Priority support</span>
              </li>
            </ul>
            <Link href="/signup">
              <Button variant="outline" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

