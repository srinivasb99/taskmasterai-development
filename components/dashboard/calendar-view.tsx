"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      <Tabs defaultValue="month">
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
        </TabsList>
        <TabsContent value="month" className="mt-4">
          <DashboardCalendar />
        </TabsContent>
        <TabsContent value="week" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Week View</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500">Week view is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="day" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Day View</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500">Day view is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="agenda" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agenda View</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500">Agenda view is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

