"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, ArrowRight, Loader2 } from "lucide-react"
import { useAISidebar } from "@/components/ai/ai-sidebar-provider"
import { useAuth } from "@/lib/auth-context"
import { generateDashboardInsights } from "@/lib/gemini"
import { useToast } from "@/components/ui/use-toast"

interface AISummaryCardProps {
  className?: string
}

export function AISummaryCard({ className }: AISummaryCardProps) {
  const { openAISidebar } = useAISidebar()
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      if (!user) return

      setLoading(true)
      try {
        const dashboardInsights = await generateDashboardInsights(user.uid)
        setInsights(dashboardInsights)
      } catch (err) {
        console.error("Error fetching AI insights:", err)
        setError("Failed to load AI insights")
        toast({
          variant: "destructive",
          title: "Error loading insights",
          description: "We couldn't load your AI insights. Please try again later.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [user, toast])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-400" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </CardContent>
      </Card>
    )
  }

  if (error || !insights) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-md font-medium flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-400" />
            AI Insights
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={openAISidebar}>
            Open Assistant
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-zinc-500">
            <p>{error || "No insights available. Add some tasks to get started!"}</p>
            <Button variant="outline" className="mt-4" onClick={openAISidebar}>
              Talk to AI Assistant
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-400" />
          AI Insights
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={openAISidebar}>
          Open Assistant
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.insights &&
            insights.insights.map((insight: any, index: number) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  insight.type === "positive"
                    ? "bg-green-900/20 border border-green-900"
                    : insight.type === "negative"
                      ? "bg-red-900/20 border border-red-900"
                      : "bg-zinc-900"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 ${
                    insight.type === "positive"
                      ? "bg-green-500"
                      : insight.type === "negative"
                        ? "bg-red-500"
                        : "bg-blue-500"
                  }`}
                ></div>
                <div>
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-zinc-400">{insight.description}</p>
                </div>
              </div>
            ))}

          <Button
            variant="outline"
            className="w-full mt-2 text-sm"
            onClick={openAISidebar}
            aria-label="Get More AI Insights"
          >
            Get more insights
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

