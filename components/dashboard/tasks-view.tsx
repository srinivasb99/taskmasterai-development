"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardTasks } from "@/components/dashboard/dashboard-tasks"
import { Plus, Filter, SortAsc, SortDesc } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function TasksView() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="space-y-6">
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
              <DropdownMenuItem>
                <SortAsc className="h-4 w-4 mr-2" />
                Sort by Due Date
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SortDesc className="h-4 w-4 mr-2" />
                Sort by Priority
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <DashboardTasks />
        </TabsContent>
        <TabsContent value="today" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500">No tasks due today.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500">No upcoming tasks.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500">No completed tasks.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

