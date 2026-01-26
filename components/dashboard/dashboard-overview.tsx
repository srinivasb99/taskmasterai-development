"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, TrendingUp, Calendar } from "lucide-react"
import { auth, db } from "@/lib/firebase" // Assuming firebase config is here
import { onUserTasksChange } from "@/lib/db" // Using real-time listener
import { collection, query, where, orderBy, limit, Timestamp, getDocs, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getCountFromServer } from "firebase/firestore"
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth"

// Define types based on assumed structures
interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: Timestamp
  dueDate?: Timestamp // Optional due date
  userId: string
}

interface Goal {
  id: string
  title: string
  completed: boolean
  userId: string
  // Add relevant fields like timeframe ('daily', 'weekly', 'monthly') or targetDate
}

interface FocusSession {
    id: string;
    userId: string;
    startTime: Timestamp;
    duration: number; // Assuming duration in minutes
}


interface DashboardOverviewProps {
  className?: string
}

export function DashboardOverview({ className }: DashboardOverviewProps) {
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]) // State for focus sessions
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (!user) {
        // Clear data if user logs out
        setTasks([])
        setGoals([])
        setFocusSessions([])
        setLoading(false)
      }
    })
    return () => unsubscribeAuth()
  }, [])

  // Fetch Tasks in real-time
  useEffect(() => {
    if (!currentUser) return

    setLoading(true)
    const unsubscribeTasks = onUserTasksChange(currentUser.uid, (fetchedTasks) => {
      // Ensure timestamps are handled correctly if needed, db.ts might already convert them
      setTasks(fetchedTasks as Task[])
      setLoading(false) // Consider loading state management across all fetches
    })

    return () => unsubscribeTasks()
  }, [currentUser])

  // Fetch Goals (one-time fetch example, could be real-time)
  useEffect(() => {
    if (!currentUser) return

    const fetchGoals = async () => {
      setLoading(true)
      try {
        // ASSUMPTION: 'goals' collection exists
        const goalsQuery = query(collection(db, "goals"), where("userId", "==", currentUser.uid))
        const snapshot = await getDocs(goalsQuery)
        const fetchedGoals = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Goal, "id">),
        }))
        setGoals(fetchedGoals)
      } catch (error) {
        console.error("Error fetching goals:", error)
        setGoals([])
      } finally {
         setLoading(false) // Adjust loading state logic if multiple fetches
      }
    }
    fetchGoals()
  }, [currentUser])

 // Fetch Focus Sessions (example: fetch last week's sessions)
  useEffect(() => {
    if (!currentUser) return;

    const fetchFocusSessions = async () => {
      setLoading(true);
      try {
        const now = new Date();
        // Example: Fetch sessions from the past 7 days
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfPeriod = Timestamp.fromDate(oneWeekAgo);

        // ASSUMPTION: 'focusSessions' collection exists with 'startTime' and 'duration'
        const focusQuery = query(
          collection(db, "focusSessions"),
          where("userId", "==", currentUser.uid),
          where("startTime", ">=", startOfPeriod),
          orderBy("startTime", "desc")
        );
        const snapshot = await getDocs(focusQuery);
        const fetchedSessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<FocusSession, 'id'>)
        }));
        setFocusSessions(fetchedSessions);
      } catch (error) {
        console.error("Error fetching focus sessions:", error);
        setFocusSessions([]);
      } finally {
        setLoading(false); // Adjust loading state
      }
    };

    fetchFocusSessions();
  }, [currentUser]);


  // Calculate progress based on timeframe and fetched tasks
  const currentProgress = useMemo(() => {
    if (!tasks.length) return { completed: 0, total: 0, percentage: 0 }

    const now = new Date()
    let start: Date, end: Date

    switch (timeframe) {
      case "daily":
        start = startOfDay(now)
        end = endOfDay(now)
        break
      case "monthly":
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case "weekly":
      default:
        start = startOfWeek(now, { weekStartsOn: 1 }) // Assuming week starts on Monday
        end = endOfWeek(now, { weekStartsOn: 1 })
        break
    }

    const startTs = Timestamp.fromDate(start)
    const endTs = Timestamp.fromDate(end)

    // Filter tasks created within the timeframe
    // NOTE: This filters by CREATION time. You might want to filter by completion time or due date.
    const relevantTasks = tasks.filter((task) => {
       // Ensure task.createdAt is a Firestore Timestamp before comparing
       const createdAtTs = task.createdAt instanceof Timestamp ? task.createdAt : Timestamp.fromDate(new Date(task.createdAt)); // Adjust if needed based on actual data type
      return createdAtTs >= startTs && createdAtTs <= endTs;
    })


    const completedTasks = relevantTasks.filter((task) => task.completed).length
    const totalTasks = relevantTasks.length
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return { completed: completedTasks, total: totalTasks, percentage }
  }, [tasks, timeframe])

  // Calculate goal progress (simple example: completed / total)
  const goalProgress = useMemo(() => {
     // TODO: Add filtering based on goal timeframe if applicable
    const completedGoals = goals.filter((goal) => goal.completed).length
    const totalGoals = goals.length
    return { completed: completedGoals, total: totalGoals }
  }, [goals])

 // Calculate total focus time for the fetched period (e.g., last week)
  const totalFocusTimeMinutes = useMemo(() => {
    return focusSessions.reduce((total, session) => total + (session.duration || 0), 0);
  }, [focusSessions]);

  // Format focus time (e.g., 270 minutes -> 4.5h)
  const formattedFocusTime = useMemo(() => {
    const hours = Math.floor(totalFocusTimeMinutes / 60);
    const minutes = totalFocusTimeMinutes % 60;
    if (minutes === 0) return `${hours}h`;
    if (hours === 0) return `${minutes}m`; // Show minutes if less than an hour
    // Simple decimal format, could be improved (e.g., 4h 30m)
    return `${(totalFocusTimeMinutes / 60).toFixed(1)}h`;
  }, [totalFocusTimeMinutes]);

 // Calculate focus time trend (Placeholder - requires fetching data from the previous period)
 const focusTimeTrend = "+0%" // Placeholder - Requires more complex logic


  // Get upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    const now = Timestamp.now()
    // ASSUMPTION: Tasks have a 'dueDate' field (Timestamp)
    return tasks
      .filter((task) => !task.completed && task.dueDate && task.dueDate > now)
      .sort((a, b) => (a.dueDate as Timestamp).toMillis() - (b.dueDate as Timestamp).toMillis())
      .slice(0, 3) // Limit to 3 upcoming deadlines
  }, [tasks])

  const formatDueDate = (dueDate: Timestamp | undefined): string => {
    if (!dueDate) return ""
    const now = new Date()
    const due = dueDate.toDate()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return "Due today"
    if (diffDays === 1) return "Due tomorrow"
    if (diffDays <= 7) return `Due in ${diffDays} days`
    if (diffDays <= 14) return `Due in 1 week`
    // Add more specific formatting as needed
    return `Due on ${due.toLocaleDateString()}`
  }

 if (loading) {
    return (
       <Card className={className}>
         <CardHeader>
           <CardTitle>Productivity Overview</CardTitle>
           <CardDescription>Loading data...</CardDescription>
         </CardHeader>
         <CardContent>
           <div className="flex justify-center items-center h-40">
             {/* Add a spinner or loading indicator here */}
             Loading...
           </div>
         </CardContent>
       </Card>
     );
  }


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
          {/* Left Column: Progress and Stats */}
          <div className="space-y-6">
            {/* Task Completion Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Task Completion ({timeframe})</h3>
                <span className="text-sm text-zinc-500">
                  {currentProgress.completed}/{currentProgress.total} tasks
                </span>
              </div>
              <Progress value={currentProgress.percentage} className="h-2" />
            </div>

            {/* Goals and Focus Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-zinc-500" />
                  <h4 className="text-sm font-medium">Goals</h4>
                </div>
                {/* Display fetched goal progress */}
                <p className="text-2xl font-bold">{goalProgress.completed}/{goalProgress.total}</p>
                <p className="text-xs text-zinc-500">
                    {goalProgress.total - goalProgress.completed > 0
                    ? `${goalProgress.total - goalProgress.completed} remaining`
                    : "All goals completed!" }

                 </p>
              </div>

              <div className="bg-zinc-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-zinc-500" />
                  {/* Update title based on what data represents */}
                  <h4 className="text-sm font-medium">Focus Time (Last 7d)</h4>
                </div>
                 {/* Display fetched focus time */}
                 <p className="text-2xl font-bold">{formattedFocusTime}</p>
                 {/* Trend calculation needs historical data */}
                 <p className="text-xs text-zinc-500">{focusTimeTrend} from previous period</p>
              </div>
            </div>
          </div>

          {/* Right Column: Upcoming Deadlines */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Upcoming Deadlines</h3>
            <div className="space-y-3">
              {loading ? (
                 <div className="text-sm text-zinc-500">Loading deadlines...</div>
              ): upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 bg-zinc-900 p-3 rounded-lg">
                    <Calendar className="h-5 w-5 text-zinc-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">{task.title}</h4>
                      {/* Format and display the due date */}
                      <p className="text-xs text-zinc-500">{formatDueDate(task.dueDate)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3 bg-zinc-900 p-3 rounded-lg">
                   <Calendar className="h-5 w-5 text-zinc-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">No upcoming deadlines</h4>
                       <p className="text-xs text-zinc-500">You're all caught up!</p>
                     </div>
                 </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
