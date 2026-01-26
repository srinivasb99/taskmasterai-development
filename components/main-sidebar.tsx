"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Clock,
  MessageSquare,
  Settings,
  LogOut,
  BrainCircuit,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAISidebar } from "@/components/ai/ai-sidebar-provider"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { getUserProfile } from "@/lib/db"

export function MainSidebar() {
  const pathname = usePathname()
  const { toggleAISidebar } = useAISidebar()
  const { user, logout } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid)
          setUserProfile(profile)
        } catch (error) {
          console.error("Error fetching user profile:", error)
        }
      }
    }

    fetchUserProfile()
  }, [user])

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Tasks",
      href: "/tasks",
      icon: CheckSquare,
    },
    {
      title: "Calendar",
      href: "/calendar",
      icon: Calendar,
    },
    {
      title: "Timers",
      href: "/timers",
      icon: Clock,
    },
    {
      title: "Chat",
      href: "/chat",
      icon: MessageSquare,
    },
  ]

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  return (
    <aside className="w-60 h-screen bg-black border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
          <span className="font-bold text-white">T</span>
        </div>
        <span className="font-bold text-xl">TaskMaster AI</span>
      </div>

      {user && (
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
              <AvatarFallback>{user.displayName ? user.displayName[0] : "U"}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="font-medium truncate">{user.displayName || "User"}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm
                transition-colors
                ${isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}
              `}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          )
        })}

        <Button
          onClick={toggleAISidebar}
          className="w-full justify-start gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          variant="ghost"
        >
          <BrainCircuit className="h-5 w-5" />
          <span>AI Assistant</span>
        </Button>
      </nav>

      <div className="p-2 border-t border-zinc-800 space-y-1">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 py-2 rounded-md text-sm
            transition-colors
            ${pathname === "/settings" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}
          `}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
        <Button
          onClick={handleLogout}
          className="w-full justify-start gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          variant="ghost"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  )
}

