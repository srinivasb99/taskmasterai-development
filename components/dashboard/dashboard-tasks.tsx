"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Plus, MoreVertical, Calendar, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { createTask, updateTask, deleteTask, onUserTasksChange } from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface DashboardTasksProps {
  className?: string
}

export function DashboardTasks({ className }: DashboardTasksProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [editFormData, setEditFormData] = useState({
    title: "",
    dueDate: "",
    priority: "medium",
    tags: "",
  })

  useEffect(() => {
    if (!user) return

    // Set up real-time listener for tasks
    const unsubscribe = onUserTasksChange(user.uid, (updatedTasks) => {
      setTasks(updatedTasks as Task[])
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleAddTask = async () => {
    if (!user || !newTaskTitle.trim()) return

    setIsAddingTask(true)
    try {
      await createTask(user.uid, {
        title: newTaskTitle,
        priority: "medium",
        tags: [],
      })

      setNewTaskTitle("")
      toast({
        title: "Task added",
        description: "Your new task has been created.",
      })
    } catch (error) {
      console.error("Error adding task:", error)
      toast({
        variant: "destructive",
        title: "Failed to add task",
        description: "There was an error creating your task. Please try again.",
      })
    } finally {
      setIsAddingTask(false)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await updateTask(taskId, { completed })
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
      await deleteTask(taskId)
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

  const handleEditTask = async () => {
    if (!currentTask) return

    try {
      const updatedTask = {
        title: editFormData.title,
        dueDate: editFormData.dueDate || null,
        priority: editFormData.priority as "high" | "medium" | "low",
        tags: editFormData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      }

      await updateTask(currentTask.id, updatedTask)
      setIsEditDialogOpen(false)
      toast({
        title: "Task updated",
        description: "Your task has been updated successfully.",
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

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Manage your to-do list</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Manage your to-do list</CardDescription>
        </div>
        <Button size="sm" onClick={() => setIsEditDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddTask()
                }
              }}
              className="flex-1"
              disabled={isAddingTask}
            />
            <Button onClick={handleAddTask} disabled={!newTaskTitle.trim() || isAddingTask} aria-label="Add Task">
              {isAddingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p>You don't have any tasks yet. Add one to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
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
                      <p className={`text-sm ${task.completed ? "line-through text-zinc-500" : ""}`}>{task.title}</p>
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
        </div>
      </CardContent>

      {/* Edit Task Dialog */}
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
            <Button onClick={handleEditTask} disabled={!editFormData.title.trim()}>
              {currentTask ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

