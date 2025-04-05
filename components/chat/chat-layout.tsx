"use client"

import type React from "react"

import { useState } from "react"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { FriendsSidebar } from "@/components/chat/friends-sidebar"

interface ChatLayoutProps {
  children: React.ReactNode
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const [showFriends, setShowFriends] = useState(true)

  return (
    <div className="flex h-full">
      <ChatSidebar onToggleFriends={() => setShowFriends(!showFriends)} />
      <div className="flex-1 overflow-hidden">{children}</div>
      {showFriends && <FriendsSidebar />}
    </div>
  )
}

