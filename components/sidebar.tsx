"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import { PlusIcon, Search, Users, User, Settings } from "lucide-react"
import { mockChats } from "@/lib/mock-data"
import { CreateChatDialog } from "./create-chat-dialog"

export function Sidebar() {
  const params = useParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredChats = mockChats.filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="w-80 border-r border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Chats</h1>
          <Button variant="ghost" size="icon" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search chats..."
            className="pl-8 bg-zinc-900 border-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredChats.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-zinc-800/50 ${
                params.chatId === chat.id ? "bg-zinc-800" : ""
              }`}
            >
              <Avatar className="h-8 w-8 border border-zinc-700">
                <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-white">
                  {chat.isGroup ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
              </Avatar>
              <div className="flex-1 truncate">
                <div className="font-medium">{chat.name}</div>
                <p className="text-xs text-zinc-500 truncate">{chat.lastMessage}</p>
              </div>
            </Link>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-zinc-800">
        <Button variant="outline" className="w-full justify-start gap-2">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Button>
      </div>
      <CreateChatDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </div>
  )
}

