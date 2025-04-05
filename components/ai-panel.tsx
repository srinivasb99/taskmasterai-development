"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Send, Bot, Loader2 } from "lucide-react"
import type { Message } from "@/lib/types"

interface AiPanelProps {
  messages: Message[]
  onClose: () => void
}

export function AiPanel({ messages, onClose }: AiPanelProps) {
  const [query, setQuery] = useState("")
  const [aiResponses, setAiResponses] = useState<{ question: string; answer: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    setIsLoading(true)

    // In a real app, we would send the query to an AI API
    // For now, we'll simulate a response
    setTimeout(() => {
      let response = ""

      if (query.toLowerCase().includes("summarize")) {
        response =
          "This conversation is about planning a project timeline and discussing design mockups. The team is planning to meet tomorrow at 2 PM, and they've shared a design mockup that will be discussed during the meeting."
      } else if (query.toLowerCase().includes("key points")) {
        response =
          "Key points from this conversation:\n1. Meeting scheduled for tomorrow at 2 PM\n2. Design mockup shared for review\n3. All team members have confirmed attendance\n4. Alex will send a calendar invite"
      } else if (query.toLowerCase().includes("action items")) {
        response =
          "Action items:\n1. Review the design mockup before the meeting\n2. Prepare feedback on the design\n3. Check calendar for the meeting invite\n4. Bring any questions about the project timeline"
      } else {
        response =
          "I've analyzed this conversation. The team is discussing project coordination and has shared visual assets. Is there something specific about this chat you'd like me to help with?"
      }

      setAiResponses([...aiResponses, { question: query, answer: response }])
      setQuery("")
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="w-80 border-l border-zinc-800 flex flex-col h-full">
      <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-400" />
          <h2 className="font-medium">AI Assistant</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Ask me anything about this conversation. I can help summarize, find information, or answer questions about
            the chat.
          </p>
          {aiResponses.map((response, index) => (
            <div key={index} className="space-y-2">
              <div className="bg-zinc-800 rounded-lg p-2">
                <p className="text-sm font-medium">You asked:</p>
                <p className="text-sm">{response.question}</p>
              </div>
              <div className="bg-zinc-900 rounded-lg p-2">
                <p className="text-sm">{response.answer}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="bg-zinc-900 rounded-lg p-2 flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <p className="text-sm">Analyzing conversation...</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t border-zinc-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about this chat..."
            className="bg-zinc-900 border-zinc-800"
            disabled={isLoading}
          />
          <Button type="submit" variant="ghost" size="icon" disabled={!query.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  )
}

