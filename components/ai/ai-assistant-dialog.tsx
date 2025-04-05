"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, Sparkles, X, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AIAssistantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Message {
  role: "user" | "assistant"
  content: string
}

export function AIAssistantDialog({ open, onOpenChange }: AIAssistantDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("chat")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there! I'm your TaskMaster AI assistant. How can I help you today?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      let response = ""

      if (input.toLowerCase().includes("summarize") || input.toLowerCase().includes("summary")) {
        response =
          "Based on your tasks and calendar, here's a summary of your week: You have 5 pending tasks, with 2 high priority items due in the next 48 hours. Your most productive time blocks are scheduled for Tuesday and Thursday mornings."
      } else if (input.toLowerCase().includes("recommend") || input.toLowerCase().includes("suggestion")) {
        response =
          "Looking at your schedule, I recommend focusing on the 'Research Paper Draft' task today. It's high priority and due soon. You also have 2 hours of free time this afternoon which would be perfect for deep work."
      } else if (input.toLowerCase().includes("help") || input.toLowerCase().includes("can you")) {
        response =
          "I can help you with task prioritization, schedule optimization, summarizing your workload, providing productivity tips, and answering questions about using TaskMaster AI. Just let me know what you need!"
      } else {
        response =
          "I've analyzed your request. Is there a specific area of your productivity you'd like me to focus on? I can help with task management, time optimization, or provide insights on your work patterns."
      }

      const assistantMessage: Message = { role: "assistant", content: response }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestedPrompts = [
    "Summarize my tasks for today",
    "What should I focus on next?",
    "Analyze my productivity patterns",
    "Help me optimize my schedule",
    "Give me a weekly progress report",
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader className="px-4 py-2 border-b border-zinc-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-400" />
            <DialogTitle>AI Assistant</DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[500px]">
          <TabsList className="px-4 py-2 bg-transparent border-b border-zinc-800 justify-start">
            <TabsTrigger value="chat" className="data-[state=active]:bg-zinc-800">
              Chat
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-zinc-800">
              Insights
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="data-[state=active]:bg-zinc-800">
              Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0 data-[state=inactive]:hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-800 text-white"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-zinc-800 text-white flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {activeTab === "chat" && messages.length === 1 && !isLoading && (
              <div className="px-4 pb-4">
                <p className="text-sm text-zinc-400 mb-3">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setInput(prompt)
                      }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-zinc-800">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="bg-zinc-900 border-zinc-800"
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isLoading} variant="default">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="flex-1 p-4 data-[state=inactive]:hidden overflow-auto">
            <div className="space-y-4">
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  <h3 className="font-medium">Productivity Score</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">78%</div>
                  <div className="text-sm text-zinc-400">+5% from last week</div>
                </div>
                <p className="text-sm text-zinc-400 mt-2">
                  Your focus time has improved, but task completion rate has slightly decreased.
                </p>
              </div>

              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  <h3 className="font-medium">Focus Analysis</h3>
                </div>
                <p className="text-sm text-zinc-400">
                  Your most productive hours are between 9AM-11AM. Consider scheduling important tasks during this time.
                </p>
              </div>

              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  <h3 className="font-medium">Task Completion</h3>
                </div>
                <p className="text-sm text-zinc-400">
                  You've completed 18 tasks this week, with an average completion time of 45 minutes per task.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="flex-1 p-4 data-[state=inactive]:hidden overflow-auto">
            <div className="space-y-4">
              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <h3 className="font-medium mb-2">Optimize Your Schedule</h3>
                <p className="text-sm text-zinc-400 mb-3">
                  You have several overlapping tasks on Thursday. Consider rescheduling the following:
                </p>
                <ul className="text-sm space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>Move "Team Meeting" to Wednesday afternoon</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <span>Reschedule "Project Review" to Friday morning</span>
                  </li>
                </ul>
              </div>

              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <h3 className="font-medium mb-2">Task Prioritization</h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Based on deadlines and importance, focus on these tasks next:
                </p>
                <ol className="text-sm space-y-2 list-decimal pl-5">
                  <li>Complete Research Paper Draft (Due in 2 days)</li>
                  <li>Prepare for Midterm Exam (Due in 1 week)</li>
                  <li>Schedule Study Group Meeting</li>
                </ol>
              </div>

              <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                <h3 className="font-medium mb-2">Productivity Tip</h3>
                <p className="text-sm text-zinc-400">
                  Try the "2-minute rule": If a task takes less than 2 minutes, do it immediately instead of scheduling
                  it for later. This reduces your backlog of small tasks.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

