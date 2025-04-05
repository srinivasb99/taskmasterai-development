import type React from "react"
import { MainSidebar } from "@/components/main-sidebar"
import { AppHeader } from "@/components/app-header"
import { ProtectedRoute } from "@/components/protected-route"
import { AISidebarProvider } from "@/components/ai/ai-sidebar-provider"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <AISidebarProvider>
        <div className="flex h-screen overflow-hidden bg-black text-white">
          <MainSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </AISidebarProvider>
    </ProtectedRoute>
  )
}

