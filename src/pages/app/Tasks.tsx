"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Checkbox } from "../../components/ui/checkbox"
import { Badge } from "../../components/ui/badge"
import { Plus, Filter, SortAsc, SortDesc, MoreVertical, Calendar, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { useAuth } from "../../lib/auth-context"
import { useToast } from "../../components/ui/use-toast"
import { db } from "../../lib/firebase"
import {
  collection,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore"

interface Task {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  priority: "high" | "medium" | "low"
  tags: string[]
  userId: string
  createdAt: any
  updatedAt: any
}

export default function Tasks() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [editFormData, setEditFormData] = useState({
    title: "",
    dueDate: "",
    priority: "medium",
    tags: "",
  })
  const [sortOrder, setSortOrder] = useState<"dueDate" | "priority" | "createdAt">("dueDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    if (!user) return

    // Set up real-time listener for tasks
    const tasksQuery = query(collection(db, "tasks"), where("userId", "==", user.uid), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasksData = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Task,
        )
        setTasks(tasksData)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching tasks:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user])

  const handleAddTask = async () => {
    if (!user) return

    try {
      setIsEditDialogOpen(true)
      setCurrentTask(null)
      setEditFormData({
        title: "",
        dueDate: "",
        priority: "medium",
        tags: "",
      })
    } catch (error) {
      console.error("Error preparing to add task:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to prepare task form. Please try again.",
      })
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        completed,
        updatedAt: serverTimestamp(),
      })

      toast({
        title: completed ? "Task completed" : "Task reopened",
        description: completed ? "Task marked as complete" : "Task marked as incomplete",
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        variant: "destructive",
        title: "Failed to update task",
        description: "There was an error updating your task. Please try again.",
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, "tasks", taskId))
      toast({
        title: "Task deleted",
        description: "Your task has been deleted.",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        variant: "destructive",
        title: "Failed to delete task",
        description: "There was an error deleting your task. Please try again.",
      })
    }
  }

  const openEditDialog = (task: Task) => {
    setCurrentTask(task)
    setEditFormData({
      title: task.title,
      dueDate: task.dueDate || "",
      priority: task.priority,
      tags: task.tags.join(", "),
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveTask = async () => {
    if (!user) return

    try {
      const taskData = {
        title: editFormData.title,
        dueDate: editFormData.dueDate || null,
        priority: editFormData.priority as "high" | "medium" | "low",
        tags: editFormData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        updatedAt: serverTimestamp(),
      }

      if (currentTask) {
        // Update existing task
        await updateDoc(doc(db, "tasks", currentTask.id), taskData)
        toast({
          title: "Task updated",
          description: "Your task has been updated successfully.",
        })
      } else {
        // Create new task
        await addDoc(collection(db, "tasks"), {
          ...taskData,
          userId: user.uid,
          completed: false,
          createdAt: serverTimestamp(),
        })
        toast({
          title: "Task created",
          description: "Your new task has been created.",
        })
      }

      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error saving task:", error)
      toast({
        variant: "destructive",
        title: "Failed to save task",
        description: "There was an error saving your task. Please try again.",
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500"
      case "medium":
        return "text-yellow-500"
      case "low":
        return "text-green-500"
      default:
        return ""
    }
  }

  const filterTasks = () => {
    let filteredTasks = [...tasks]

    // Apply search filter
    if (searchQuery) {
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    // Apply tab filter
    switch (activeTab) {
      case "today":
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        filteredTasks = filteredTasks.filter((task) => {
          if (!task.dueDate) return false
          const dueDate = new Date(task.dueDate)
          return dueDate >= today && dueDate < tomorrow
        })
        break
      case "upcoming":
        const now = new Date()
        filteredTasks = filteredTasks.filter((task) => {
          if (!task.dueDate || task.completed) return false
          const dueDate = new Date(task.dueDate)
          return dueDate > now
        })
        break
      case "completed":
        filteredTasks = filteredTasks.filter((task) => task.completed)
        break
      default: // "all"
        break
    }

    // Apply sorting
    filteredTasks.sort((a, b) => {
      let valueA, valueB

      switch (sortOrder) {
        case "dueDate":
          valueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY
          valueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY
          break
        case "priority":
          const priorityValues = { high: 3, medium: 2, low: 1 }
          valueA = priorityValues[a.priority] || 0
          valueB = priorityValues[b.priority] || 0
          break
        default: // createdAt
          valueA = a.createdAt ? new Date(a.createdAt.toDate()).getTime() : 0
          valueB = b.createdAt ? new Date(b.createdAt.toDate()).getTime() : 0
          break
      }

      return sortDirection === "asc" ? valueA - valueB : valueB - valueA
    })

    return filteredTasks
  }

  const filteredTasks = filterTasks()

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-none sm:min-w-[300px]">
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSortOrder("dueDate")
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                }}
              >
                {sortDirection === "asc" ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                Sort by Due Date
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortOrder("priority")
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                }}
              >
                {sortDirection === "asc" ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                Sort by Priority
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleAddTask}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No tasks found</p>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start justify-between p-3 rounded-lg ${
                        task.completed ? "bg-zinc-900/50" : "bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={(checked) => handleToggleTask(task.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div>
                          <p className={`text-sm ${task.completed ? "line-through text-zinc-500" : ""}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-xs text-zinc-500">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </div>
                          </div>
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(task)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteTask(task.id)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit/Create Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle>{currentTask ? "Edit Task" : "Create New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder="Enter task title"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={editFormData.dueDate}
                onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={editFormData.priority}
                onValueChange={(value) => setEditFormData({ ...editFormData, priority: value })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={editFormData.tags}
                onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                placeholder="e.g., Work, Personal, Urgent"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} disabled={!editFormData.title.trim()}>
              {currentTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

