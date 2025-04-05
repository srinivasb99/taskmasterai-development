"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import { AISidebar } from "@/components/ai/ai-sidebar"

interface AISidebarContextType {
  isOpen: boolean
  toggleAISidebar: () => void
  openAISidebar: () => void
  closeAISidebar: () => void
}

const AISidebarContext = createContext<AISidebarContextType | undefined>(undefined)

export function useAISidebar() {
  const context = useContext(AISidebarContext)
  if (!context) {
    throw new Error("useAISidebar must be used within an AISidebarProvider")
  }
  return context
}

export function AISidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleAISidebar = () => setIsOpen((prev) => !prev)
  const openAISidebar = () => setIsOpen(true)
  const closeAISidebar = () => setIsOpen(false)

  return (
    <AISidebarContext.Provider value={{ isOpen, toggleAISidebar, openAISidebar, closeAISidebar }}>
      {children}
      <AISidebar />
    </AISidebarContext.Provider>
  )
}

