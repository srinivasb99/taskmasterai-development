"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, TrendingUp, Calendar } from "lucide-react"

interface DashboardOverviewProps {
  className?: string
}

export function DashboardOverview({ className }: DashboardOverviewProps) {
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("weekly")

  // Mock data for the overview
  const progressData = {
    daily: { completed: 5, total: 8, percentage: 62 },
    weekly: { completed: 18, total: 25, percentage: 72 },
    monthly: { completed: 65, total: 100, percentage: 65 },
  }

  const currentProgress = progressData[timeframe]

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Productivity Overview</CardTitle>
          <CardDescription>Track your progress towards your goals</CardDescription>
        </div>
        <Tabs defaultValue="weekly" onValueChange={(value) => setTimeframe(value as any)}>
          <TabsList className="bg-zinc-900">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Task Completion</h3>
                <span className="text-sm text-zinc-500">
                  {currentProgress.completed}/{currentProgress.total} tasks
                </span>
              </div>
              <Progress value={currentProgress.percentage} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-zinc-500" />
                  <h4 className="text-sm font-medium">Goals</h4>
                </div>
                <p className="text-2xl font-bold">3/5</p>
                <p className="text-xs text-zinc-500">On track for 2 more</p>
              </div>

              <div className="bg-zinc-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-zinc-500" />
                  <h4 className="text-sm font-medium">Focus Time</h4>
                </div>
                <p className="text-2xl font-bold">4.5h</p>
                <p className="text-xs text-zinc-500">+12% from last week</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Upcoming Deadlines</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-zinc-900 p-3 rounded-lg">
                <Calendar className="h-5 w-5 text-zinc-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Research Paper Draft</h4>
                  <p className="text-xs text-zinc-500">Due in 2 days</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-zinc-900 p-3 rounded-lg">
                <Calendar className="h-5 w-5 text-zinc-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Group Presentation</h4>
                  <p className="text-xs text-zinc-500">Due in 5 days</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-zinc-900 p-3 rounded-lg">
                <Calendar className="h-5 w-5 text-zinc-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium">Midterm Exam</h4>
                  <p className="text-xs text-zinc-500">Due in 1 week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

