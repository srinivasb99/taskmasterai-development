"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { ChatLayout } from "@/components/chat/chat-layout"
import { ChatHeader } from "@/components/chat/chat-header"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { mockChats, mockMessages } from "@/lib/mock-data"
import type { Message } from "@/lib/types"

export default function ChatRoom() {
  const { chatId } = useParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [chat, setChat] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // In a real app, we would fetch messages from an API
    const currentChat = mockChats.find((c) => c.id === chatId)
    setChat(currentChat)

    const chatMessages = mockMessages.filter((m) => m.chatId === chatId)
    setMessages(chatMessages)
  }, [chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = (content: string, files?: File[]) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      chatId: chatId as string,
      content,
      sender: {
        id: "current-user",
        name: "You",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      timestamp: new Date().toISOString(),
      status: "sent",
      attachments: files
        ? files.map((file) => ({
            id: `file-${Date.now()}-${file.name}`,
            name: file.name,
            type: file.type,
            url: URL.createObjectURL(file),
            size: file.size,
          }))
        : [],
    }

    setMessages((prev) => [...prev, newMessage])
  }

  if (!chat) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <ChatLayout>
      <div className="flex flex-col h-full">
        <ChatHeader chat={chat} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <MessageList messages={messages} />
          <div ref={messagesEndRef} />
          <MessageInput onSendMessage={handleSendMessage} />
        </div>
      </div>
    </ChatLayout>
  )
}

