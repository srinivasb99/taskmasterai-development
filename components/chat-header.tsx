"use client"

import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Info, Users, User, Bot } from "lucide-react"

interface ChatHeaderProps {
  chat: {
    id: string
    name: string
    isGroup: boolean
  }
  onAiToggle: () => void
}

export function ChatHeader({ chat, onAiToggle }: ChatHeaderProps) {
  return (
    <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 border border-zinc-700">
          <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-white">
            {chat.isGroup ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
        </Avatar>
        <div>
          <h2 className="font-medium">{chat.name}</h2>
          <p className="text-xs text-zinc-500">{chat.isGroup ? "Group chat" : "Direct message"}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={onAiToggle}>
          <Bot className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Info className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

