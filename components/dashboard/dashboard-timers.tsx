"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, RotateCcw, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Timer {
  id: string
  name: string
  workDuration: number
  breakDuration: number
  longBreakDuration: number
  sessionsBeforeLongBreak: number
}

interface DashboardTimersProps {
  className?: string
}

export function DashboardTimers({ className }: DashboardTimersProps) {
  const [timers, setTimers] = useState<Timer[]>([
    {
      id: "default",
      name: "Pomodoro",
      workDuration: 25 * 60,
      breakDuration: 5 * 60,
      longBreakDuration: 15 * 60,
      sessionsBeforeLongBreak: 4,
    },
    {
      id: "short",
      name: "Short Focus",
      workDuration: 15 * 60,
      breakDuration: 3 * 60,
      longBreakDuration: 10 * 60,
      sessionsBeforeLongBreak: 4,
    },
  ])

  const [activeTimerId, setActiveTimerId] = useState("default")
  const [timeLeft, setTimeLeft] = useState(timers[0].workDuration)
  const [isRunning, setIsRunning] = useState(false)
  const [currentSession, setCurrentSession] = useState<"work" | "break" | "longBreak">("work")
  const [completedSessions, setCompletedSessions] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTimer, setNewTimer] = useState<Omit<Timer, "id">>({
    name: "",
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const activeTimer = timers.find((timer) => timer.id === activeTimerId) || timers[0]

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const handleTimerComplete = () => {
    if (currentSession === "work") {
      const newCompletedSessions = completedSessions + 1
      setCompletedSessions(newCompletedSessions)

      if (newCompletedSessions % activeTimer.sessionsBeforeLongBreak === 0) {
        setCurrentSession("longBreak")
        setTimeLeft(activeTimer.longBreakDuration)
      } else {
        setCurrentSession("break")
        setTimeLeft(activeTimer.breakDuration)
      }
    } else {
      setCurrentSession("work")
      setTimeLeft(activeTimer.workDuration)
    }

    // Pause the timer when a session completes
    setIsRunning(false)

    // Play a sound or show a notification in a real app
    // For now, we'll just log to the console
    console.log(`${currentSession} session completed!`)
  }

  const handleStartPause = () => {
    setIsRunning(!isRunning)
  }

  const handleReset = () => {
    setIsRunning(false)
    setCurrentSession("work")
    setTimeLeft(activeTimer.workDuration)
    setCompletedSessions(0)
  }

  const handleChangeTimer = (timerId: string) => {
    setIsRunning(false)
    setActiveTimerId(timerId)
    const timer = timers.find((t) => t.id === timerId) || timers[0]
    setTimeLeft(timer.workDuration)
    setCurrentSession("work")
    setCompletedSessions(0)
  }

  const handleCreateTimer = () => {
    const newTimerId = `timer-${Date.now()}`
    const timerToAdd: Timer = {
      id: newTimerId,
      name: newTimer.name,
      workDuration: newTimer.workDuration * 60,
      breakDuration: newTimer.breakDuration * 60,
      longBreakDuration: newTimer.longBreakDuration * 60,
      sessionsBeforeLongBreak: newTimer.sessionsBeforeLongBreak,
    }

    setTimers([...timers, timerToAdd])
    setIsCreateDialogOpen(false)

    // Reset the form
    setNewTimer({
      name: "",
      workDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const calculateProgress = () => {
    let totalDuration

    switch (currentSession) {
      case "work":
        totalDuration = activeTimer.workDuration
        break
      case "break":
        totalDuration = activeTimer.breakDuration
        break
      case "longBreak":
        totalDuration = activeTimer.longBreakDuration
        break
    }

    const progress = ((totalDuration - timeLeft) / totalDuration) * 100
    return progress
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pomodoro Timer</CardTitle>
          <CardDescription>Stay focused and productive</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTimerId} onValueChange={handleChangeTimer} className="mb-4">
          <TabsList className="bg-zinc-900 w-full">
            {timers.map((timer) => (
              <TabsTrigger key={timer.id} value={timer.id} className="flex-1">
                {timer.name}
              </TabsTrigger>
            ))}
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
                strokeDashoffset={283 - (283 * calculateProgress()) / 100}
                className={`
                  ${currentSession === "work" ? "text-blue-500" : ""}
                  ${currentSession === "break" ? "text-green-500" : ""}
                  ${currentSession === "longBreak" ? "text-purple-500" : ""}
                `}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold">{formatTime(timeLeft)}</span>
              <span className="text-sm text-zinc-500 capitalize">{currentSession}</span>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={handleStartPause} className="w-24" aria-label={isRunning ? "Pause Timer" : "Start Timer"}>
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="text-sm text-zinc-500">Sessions completed: {completedSessions}</div>
        </div>
      </CardContent>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Create New Timer</DialogTitle>
            <DialogDescription>Customize your timer settings for optimal productivity.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="timer-name">Timer Name</Label>
              <Input
                id="timer-name"
                value={newTimer.name}
                onChange={(e) => setNewTimer({ ...newTimer, name: e.target.value })}
                placeholder="e.g., Study Timer"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work-duration">Work Duration (minutes)</Label>
                <Input
                  id="work-duration"
                  type="number"
                  min="1"
                  value={newTimer.workDuration}
                  onChange={(e) => setNewTimer({ ...newTimer, workDuration: Number.parseInt(e.target.value) || 25 })}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="break-duration">Break Duration (minutes)</Label>
                <Input
                  id="break-duration"
                  type="number"
                  min="1"
                  value={newTimer.breakDuration}
                  onChange={(e) => setNewTimer({ ...newTimer, breakDuration: Number.parseInt(e.target.value) || 5 })}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="long-break-duration">Long Break Duration (minutes)</Label>
                <Input
                  id="long-break-duration"
                  type="number"
                  min="1"
                  value={newTimer.longBreakDuration}
                  onChange={(e) =>
                    setNewTimer({ ...newTimer, longBreakDuration: Number.parseInt(e.target.value) || 15 })
                  }
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessions-before-long-break">Sessions Before Long Break</Label>
                <Input
                  id="sessions-before-long-break"
                  type="number"
                  min="1"
                  value={newTimer.sessionsBeforeLongBreak}
                  onChange={(e) =>
                    setNewTimer({ ...newTimer, sessionsBeforeLongBreak: Number.parseInt(e.target.value) || 4 })
                  }
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTimer} disabled={!newTimer.name.trim()}>
              Create Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

