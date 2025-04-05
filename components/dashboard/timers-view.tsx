"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardTimers } from "@/components/dashboard/dashboard-timers"
import { Plus } from "lucide-react"

export function TimersView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold">Timers</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Timer
        </Button>
      </div>

      <Tabs defaultValue="pomodoro">
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
          <TabsTrigger value="stopwatch">Stopwatch</TabsTrigger>
          <TabsTrigger value="countdown">Countdown</TabsTrigger>
        </TabsList>
        <TabsContent value="pomodoro" className="mt-4">
          <DashboardTimers />
        </TabsContent>
        <TabsContent value="stopwatch" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stopwatch</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500">Stopwatch feature is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="countdown" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Countdown Timer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500">Countdown timer feature is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

