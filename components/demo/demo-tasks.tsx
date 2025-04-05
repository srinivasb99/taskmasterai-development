"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar } from "lucide-react"

interface DemoTasksProps {
  className?: string
}

export function DemoTasks({ className }: DemoTasksProps) {
  const tasks = [
    {
      id: "task-1",
      title: "Complete research paper outline",
      completed: false,
      dueDate: "2023-04-15",
      priority: "high",
      tags: ["School", "Research"],
    },
    {
      id: "task-2",
      title: "Review lecture notes for midterm",
      completed: false,
      dueDate: "2023-04-12",
      priority: "medium",
      tags: ["School"],
    },
    {
      id: "task-3",
      title: "Schedule study group meeting",
      completed: true,
      dueDate: "2023-04-10",
      priority: "low",
      tags: ["School", "Group"],
    },
    {
      id: "task-4",
      title: "Complete programming assignment",
      completed: false,
      dueDate: "2023-04-18",
      priority: "high",
      tags: ["Coding", "School"],
    },
  ]

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

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>Manage your to-do list</CardDescription>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start justify-between p-3 rounded-lg ${
                task.completed ? "bg-zinc-900/50" : "bg-zinc-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={task.completed} className="mt-1" />
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
                  {task.tags.length > 0 && (
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

