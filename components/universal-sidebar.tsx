"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, CheckSquare, Calendar, Clock, MessageSquare, Settings, LogOut } from "lucide-react"

interface SidebarProps {
  className?: string
}

export function UniversalSidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Tasks",
      href: "/dashboard/tasks",
      icon: CheckSquare,
    },
    {
      title: "Calendar",
      href: "/dashboard/calendar",
      icon: Calendar,
    },
    {
      title: "Timers",
      href: "/dashboard/timers",
      icon: Clock,
    },
    {
      title: "Chat",
      href: "/chat",
      icon: MessageSquare,
    },
  ]

  return (
    <aside className="w-60 h-screen bg-black border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
          <span className="font-bold text-white">T</span>
        </div>
        <span className="font-bold text-xl">TaskMaster AI</span>
      </div>

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
      </nav>

      <div className="p-2 border-t border-zinc-800 space-y-1">
        <Link
          href="/dashboard/settings"
          className={`
            flex items-center gap-3 px-3 py-2 rounded-md text-sm
            transition-colors
            ${pathname === "/dashboard/settings" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}
          `}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
        <Link
          href="/logout"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  )
}

