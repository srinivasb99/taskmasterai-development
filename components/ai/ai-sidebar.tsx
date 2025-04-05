"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, Sparkles, X, Loader2, MessageSquare, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAISidebar } from "@/components/ai/ai-sidebar-provider"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  getUserAIConversations,
  createAIConversation,
  getAIConversationMessages,
  addAIMessage,
  onUserTasksChange,
} from "@/lib/db"
import { generateGeminiResponse, analyzeTasksAndProvideInsights } from "@/lib/gemini"
import { useToast } from "@/components/ui/use-toast"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: any
}

interface Conversation {
  id: string
  title: string
  userId: string
  createdAt: any
  updatedAt: any
  messages?: Message[]
}

export function AISidebar() {
  const { isOpen, closeAISidebar } = useAISidebar()
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<string>("chat")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [productivityInsights, setProductivityInsights] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch user's AI conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return

      setIsLoadingConversations(true)
      try {
        const userConversations = await getUserAIConversations(user.uid)
        setConversations(userConversations as Conversation[])
      } catch (error) {
        console.error("Error fetching AI conversations:", error)
        toast({
          variant: "destructive",
          title: "Failed to load conversations",
          description: "There was an error loading your AI conversations.",
        })
      } finally {
        setIsLoadingConversations(false)
      }
    }

    fetchConversations()
  }, [user, toast])

  // Set up real-time listener for tasks
  useEffect(() => {
    if (!user) return

    const unsubscribe = onUserTasksChange(user.uid, (updatedTasks) => {
      setTasks(updatedTasks)
    })

    return () => unsubscribe()
  }, [user])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Fetch messages when active conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversation) {
        setMessages([])
        return
      }

      try {
        const conversationMessages = await getAIConversationMessages(activeConversation.id)
        setMessages(conversationMessages as Message[])
      } catch (error) {
        console.error("Error fetching conversation messages:", error)
        toast({
          variant: "destructive",
          title: "Failed to load messages",
          description: "There was an error loading the conversation messages.",
        })
      }
    }

    fetchMessages()
  }, [activeConversation, toast])

  // Fetch productivity insights when tab changes to insights
  useEffect(() => {
    const fetchInsights = async () => {
      if (!user || activeTab !== "insights") return

      setIsLoadingInsights(true)
      try {
        const insights = await analyzeTasksAndProvideInsights(user.uid)
        setProductivityInsights(insights)
      } catch (error) {
        console.error("Error fetching productivity insights:", error)
        toast({
          variant: "destructive",
          title: "Failed to load insights",
          description: "There was an error analyzing your productivity data.",
        })
      } finally {
        setIsLoadingInsights(false)
      }
    }

    fetchInsights()
  }, [user, activeTab, toast])

  const handleSend = async () => {
    if (!user || !input.trim() || isLoading) return

    setIsLoading(true)

    try {
      // Create a new conversation if none is active
      if (!activeConversation) {
        // Create a new conversation in Firestore
        const { id } = await createAIConversation(
          user.uid,
          input.length > 20 ? `${input.substring(0, 20)}...` : input,
          input,
        )

        // Add user message to UI immediately
        const userMessage: Message = {
          id: `temp-${Date.now()}`,
          role: "user",
          content: input,
          timestamp: new Date(),
        }

        setMessages([userMessage])
        setInput("")

        // Fetch the newly created conversation
        const conversations = await getUserAIConversations(user.uid)
        setConversations(conversations as Conversation[])

        // Set the active conversation
        const newConversation = conversations.find((c) => c.id === id)
        if (newConversation) {
          setActiveConversation(newConversation as Conversation)
        }

        // Generate AI response
        const aiResponse = await generateGeminiResponse(input)

        // Add AI response to Firestore
        await addAIMessage(id, "assistant", aiResponse)

        // Add AI response to UI
        setMessages((prev) => [
          ...prev,
          {
            id: `temp-${Date.now() + 1}`,
            role: "assistant",
            content: aiResponse,
            timestamp: new Date(),
          },
        ])
      } else {
        // Add message to existing conversation
        const userMessage: Message = {
          id: `temp-${Date.now()}`,
          role: "user",
          content: input,
          timestamp: new Date(),
        }

        // Add user message to UI immediately
        setMessages((prev) => [...prev, userMessage])

        // Add user message to Firestore
        await addAIMessage(activeConversation.id, "user", input)

        setInput("")

        // Prepare conversation history for context
        const history = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

        // Generate AI response with conversation history
        const aiResponse = await generateGeminiResponse(input, history)

        // Add AI response to Firestore
        await addAIMessage(activeConversation.id, "assistant", aiResponse)

        // Add AI response to UI
        setMessages((prev) => [
          ...prev,
          {
            id: `temp-${Date.now() + 1}`,
            role: "assistant",
            content: aiResponse,
            timestamp: new Date(),
          },
        ])

        // Update conversations list
        const updatedConversations = await getUserAIConversations(user.uid)
        setConversations(updatedConversations as Conversation[])
      }
    } catch (error) {
      console.error("Error in AI conversation:", error)
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "There was an error processing your request. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startNewConversation = () => {
    setActiveConversation(null)
    setMessages([])
    setInput("")
  }

  const refreshInsights = async () => {
    if (!user) return

    setIsLoadingInsights(true)
    try {
      const insights = await analyzeTasksAndProvideInsights(user.uid)
      setProductivityInsights(insights)
      toast({
        title: "Insights refreshed",
        description: "Your productivity insights have been updated.",
      })
    } catch (error) {
      console.error("Error refreshing productivity insights:", error)
      toast({
        variant: "destructive",
        title: "Failed to refresh insights",
        description: "There was an error analyzing your productivity data.",
      })
    } finally {
      setIsLoadingInsights(false)
    }
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ""

    const date = timestamp instanceof Date ? timestamp : timestamp.toDate ? timestamp.toDate() : new Date(timestamp)

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const suggestedPrompts = [
    "Summarize my tasks for today",
    "What should I focus on next?",
    "Analyze my productivity patterns",
    "Help me optimize my schedule",
    "Give me a weekly progress report",
  ]

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50 w-96 bg-zinc-950 border-l border-zinc-800 shadow-xl transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-400" />
            <h2 className="font-medium">AI Assistant</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={closeAISidebar} aria-label="Close AI Assistant">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <TabsList className="px-4 py-2 bg-transparent border-b border-zinc-800 justify-start">
            <TabsTrigger value="chat" className="data-[state=active]:bg-zinc-800">
              Chat
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-zinc-800">
              History
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-zinc-800">
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0 data-[state=inactive]:hidden">
            {activeConversation ? (
              <>
                <div className="flex items-center justify-between p-2 border-b border-zinc-800">
                  <h3 className="text-sm font-medium truncate">{activeConversation.title}</h3>
                  <Button variant="ghost" size="sm" onClick={startNewConversation}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Chat
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-800 text-white"
                          }`}
                        >
                          <div className="mb-1">{message.content}</div>
                          <div className="text-xs opacity-70 text-right">{formatTime(message.timestamp)}</div>
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
              </>
            ) : (
              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold">How can I help you today?</h3>
                  <p className="text-zinc-400 text-center max-w-xs">
                    Ask me anything about your tasks, schedule, or productivity. I'm here to help you stay organized and
                    efficient.
                  </p>

                  <div className="w-full max-w-sm mt-6">
                    <p className="text-sm text-zinc-400 mb-3">Try asking:</p>
                    <div className="flex flex-col gap-2">
                      {suggestedPrompts.map((prompt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="justify-start text-left"
                          onClick={() => {
                            setInput(prompt)
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {prompt}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
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

          <TabsContent value="history" className="flex-1 p-0 m-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Conversations</h3>

                {isLoadingConversations ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <p>No conversations yet. Start a new chat to begin!</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <Button
                      key={conversation.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-left p-3 h-auto",
                        activeConversation?.id === conversation.id && "bg-zinc-800",
                      )}
                      onClick={() => setActiveConversation(conversation)}
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex justify-between items-center w-full">
                          <span className="font-medium">{conversation.title}</span>
                          <span className="text-xs text-zinc-500">
                            {conversation.updatedAt
                              ? new Date(conversation.updatedAt.toDate()).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))
                )}

                <Button variant="outline" className="w-full mt-4" onClick={startNewConversation}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start New Conversation
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="insights" className="flex-1 p-4 data-[state=inactive]:hidden overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">Productivity Insights</h3>
              <Button variant="outline" size="sm" onClick={refreshInsights} disabled={isLoadingInsights}>
                {isLoadingInsights ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            {isLoadingInsights ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : !productivityInsights ? (
              <div className="text-center py-10 text-zinc-500">
                <p>No insights available yet. Add some tasks to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {productivityInsights.productivityScore && (
                  <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-blue-400" />
                      <h3 className="font-medium">Productivity Score</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold">{productivityInsights.productivityScore.score}%</div>
                      {productivityInsights.productivityScore.change && (
                        <div
                          className={`text-sm ${productivityInsights.productivityScore.change > 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {productivityInsights.productivityScore.change > 0 ? "+" : ""}
                          {productivityInsights.productivityScore.change}%
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 mt-2">{productivityInsights.productivityScore.explanation}</p>
                  </div>
                )}

                {productivityInsights.priorityTasks && productivityInsights.priorityTasks.length > 0 && (
                  <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-blue-400" />
                      <h3 className="font-medium">Priority Tasks</h3>
                    </div>
                    <div className="space-y-2">
                      {productivityInsights.priorityTasks.map((task: any, index: number) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-zinc-400">{task.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {productivityInsights.timeManagement && (
                  <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-blue-400" />
                      <h3 className="font-medium">Time Management</h3>
                    </div>
                    {productivityInsights.timeManagement.suggestions && (
                      <div className="space-y-2">
                        {productivityInsights.timeManagement.suggestions.map((suggestion: string, index: number) => (
                          <p key={index} className="text-sm text-zinc-400">
                            {suggestion}
                          </p>
                        ))}
                      </div>
                    )}
                    {productivityInsights.timeManagement.optimalFocusTime && (
                      <p className="text-sm font-medium mt-2">
                        Optimal focus time: {productivityInsights.timeManagement.optimalFocusTime}
                      </p>
                    )}
                  </div>
                )}

                {productivityInsights.insights && productivityInsights.insights.length > 0 && (
                  <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-blue-400" />
                      <h3 className="font-medium">Additional Insights</h3>
                    </div>
                    <div className="space-y-2">
                      {productivityInsights.insights.map((insight: string, index: number) => (
                        <p key={index} className="text-sm text-zinc-400">
                          {insight}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {productivityInsights.conflicts && productivityInsights.conflicts.length > 0 && (
                  <div className="bg-red-900/20 rounded-lg p-4 border border-red-900">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-red-400" />
                      <h3 className="font-medium">Potential Conflicts</h3>
                    </div>
                    <div className="space-y-2">
                      {productivityInsights.conflicts.map((conflict: string, index: number) => (
                        <p key={index} className="text-sm text-red-400">
                          {conflict}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

