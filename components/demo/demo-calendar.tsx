"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DemoCalendarProps {
  className?: string
}

export function DemoCalendar({ className }: DemoCalendarProps) {
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

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Mock events data
  const events = [
    { date: 5, title: "Research Paper Due" },
    { date: 12, title: "Group Meeting" },
    { date: 15, title: "Midterm Exam" },
    { date: 22, title: "Project Presentation" },
  ]

  const renderCalendarDays = () => {
    const days = []
    const daysInMonth = 30 // Mock value for April
    const firstDayOfMonth = 6 // Mock value for April 2023 (Saturday)

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 text-center text-zinc-600"></div>)
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === 15 // Mock today as the 15th
      const hasEvent = events.some((event) => event.date === day)

      days.push(
        <div key={`day-${day}`} className={`h-10 text-center relative ${isToday ? "bg-zinc-800 rounded-full" : ""}`}>
          <span className={`inline-flex items-center justify-center w-8 h-8 ${isToday ? "font-bold" : ""}`}>{day}</span>
          {hasEvent && (
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
          )}
        </div>,
      )
    }

    return days
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>Your schedule at a glance</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">April 2023</span>
          <Button variant="ghost" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 mb-2">
              {day}
            </div>
          ))}
          {renderCalendarDays()}
        </div>

        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Upcoming Events</h4>
          {events.map((event, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="font-medium">{event.date}</span>
              <span className="text-zinc-400">-</span>
              <span>{event.title}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

