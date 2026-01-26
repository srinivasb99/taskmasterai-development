"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Target, TrendingUp, Calendar, Loader2 } from "lucide-react"
import { useAuth } from "../../lib/auth-context"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { db } from "../../lib/firebase"
import { AISummaryCard } from "../../components/ai/ai-summary-card"

export default function Dashboard() {
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [tasks, setTasks] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      setLoading(true)
      try {
        // Fetch tasks
        const tasksQuery = query(collection(db, "tasks"), where("userId", "==", user.uid), orderBy("createdAt", "desc"))
        const tasksSnapshot = await getDocs(tasksQuery)
        const tasksData = tasksSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setTasks(tasksData)

        // Fetch events
        const eventsQuery = query(
          collection(db, "events"),
          where("userId", "==", user.uid),
          orderBy("startTime", "asc"),
        )
        const eventsSnapshot = await getDocs(eventsQuery)
        const eventsData = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setEvents(eventsData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Calculate progress data based on real tasks
  const calculateProgressData = () => {
    const now = new Date()
    let relevantTasks = []

    if (timeframe === "daily") {
      // Filter tasks for today
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)

      relevantTasks = tasks.filter((task) => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null
        return dueDate && dueDate >= startOfDay && dueDate <= endOfDay
      })
    } else if (timeframe === "weekly") {
      // Filter tasks for this week
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      relevantTasks = tasks.filter((task) => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null
        return dueDate && dueDate >= startOfWeek && dueDate <= endOfWeek
      })
    } else if (timeframe === "monthly") {
      // Filter tasks for this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

      relevantTasks = tasks.filter((task) => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null
        return dueDate && dueDate >= startOfMonth && dueDate <= endOfMonth
      })
    }

    const completed = relevantTasks.filter((task) => task.completed).length
    const total = relevantTasks.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return { completed, total, percentage }
  }

  const progressData = calculateProgressData()

  // Get upcoming deadlines
  const getUpcomingDeadlines = () => {
    const now = new Date()
    const twoWeeksFromNow = new Date(now)
    twoWeeksFromNow.setDate(now.getDate() + 14)

    return tasks
      .filter((task) => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null
        return !task.completed && dueDate && dueDate >= now && dueDate <= twoWeeksFromNow
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3)
  }

  const upcomingDeadlines = getUpcomingDeadlines()

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
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
                      {progressData.completed}/{progressData.total} tasks
                    </span>
                  </div>
                  <Progress value={progressData.percentage} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-zinc-500" />
                      <h4 className="text-sm font-medium">Goals</h4>
                    </div>
                    <p className="text-2xl font-bold">
                      {tasks.filter((t) => t.completed && t.tags?.includes("goal")).length}/
                      {tasks.filter((t) => t.tags?.includes("goal")).length}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {tasks.filter((t) => !t.completed && t.tags?.includes("goal")).length} remaining
                    </p>
                  </div>

                  <div className="bg-zinc-900 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-zinc-500" />
                      <h4 className="text-sm font-medium">Focus Time</h4>
                    </div>
                    <p className="text-2xl font-bold">
                      {/* Calculate focus time from timer sessions if available */}
                      0h
                    </p>
                    <p className="text-xs text-zinc-500">Start a timer session</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Upcoming Deadlines</h3>
                {upcomingDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingDeadlines.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 bg-zinc-900 p-3 rounded-lg">
                        <Calendar className="h-5 w-5 text-zinc-500 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium">{task.title}</h4>
                          <p className="text-xs text-zinc-500">
                            Due in{" "}
                            {Math.ceil(
                              (new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                            )}{" "}
                            days
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 bg-zinc-900 rounded-lg">
                    <p className="text-zinc-500">No upcoming deadlines</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <AISummaryCard />

        {/* Additional dashboard cards would go here */}
      </div>
    </div>
  )
}

