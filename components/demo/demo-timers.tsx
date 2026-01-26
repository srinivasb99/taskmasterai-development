"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, RotateCcw } from "lucide-react"

interface DemoTimersProps {
  className?: string
}

export function DemoTimers({ className }: DemoTimersProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pomodoro Timer</CardTitle>
          <CardDescription>Stay focused and productive</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pomodoro" className="mb-4">
          <TabsList className="bg-zinc-900 w-full">
            <TabsTrigger value="pomodoro" className="flex-1">
              Pomodoro
            </TabsTrigger>
            <TabsTrigger value="short" className="flex-1">
              Short Focus
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48 mb-6">
            <div className="absolute inset-0 rounded-full bg-zinc-900"></div>
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                className="text-zinc-800"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * 30) / 100}
                className="text-blue-500"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">25:00</span>
              <span className="text-sm text-zinc-500 capitalize">work</span>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button className="w-24">
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
            <Button variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="text-sm text-zinc-500">Sessions completed: 0</div>
        </div>
      </CardContent>
    </Card>
  )
}

