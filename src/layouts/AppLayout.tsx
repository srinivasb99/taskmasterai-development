import { Outlet } from "react-router-dom"
import { MainSidebar } from "../components/main-sidebar"
import { AppHeader } from "../components/app-header"

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      <MainSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

