import { Outlet } from "react-router-dom"
import { MainNav } from "../components/main-nav"
import { LandingFooter } from "../components/landing/landing-footer"

export default function MarketingLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800">
        <div className="container mx-auto px-4 py-4">
          <MainNav />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <LandingFooter />
    </div>
  )
}

