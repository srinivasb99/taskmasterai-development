import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingFeatures } from "@/components/landing/landing-features"
import { LandingTestimonials } from "@/components/landing/landing-testimonials"
import { LandingCta } from "@/components/landing/landing-cta"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
              <span className="font-bold text-white">T</span>
            </div>
            <span className="font-bold text-xl">TaskMaster AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#testimonials" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Testimonials
            </Link>
            <Link href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingTestimonials />
        <LandingCta />
      </main>
    </div>
  )
}

