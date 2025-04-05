"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DashboardCalendarProps {
  className?: string
  // Consider adding a prop for real event data later, e.g.:
  // events?: { date: Date; title: string }[]; 
}

export function DashboardCalendar({ className }: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() // 0 = Sunday, 1 = Monday, ...

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const renderCalendarDays = () => {
    const days = []
    const today = new Date()
    const isCurrentMonthView =
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 text-center"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonthView && today.getDate() === day
      const hasEvent = false; // Placeholder

      days.push(
        <div
          key={`day-${day}`}
          // *** THE FIX IS HERE: Added the closing > after the className prop ***
          className={`h-10 text-center relative flex items-center justify-center`} 
        > 
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
              isToday ? "bg-zinc-800 text-white font-bold" : ""
            } ${hasEvent ? "border border-blue-500" : ""}`} 
          >
            {day}
          </span>
        </div>,
      )
    }

    return days
  }

  // The rest of the component remains the same
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>Your schedule at a glance</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
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
        {/* Upcoming Events section removed */}
      </CardContent>
    </Card>
  )
}
