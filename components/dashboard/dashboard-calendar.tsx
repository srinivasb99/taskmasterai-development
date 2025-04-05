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

  // Removed mock events data here

  const renderCalendarDays = () => {
    const days = []
    const today = new Date()
    const isCurrentMonthView =
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()

    // Add empty cells for days before the first day of the month
    // Adjusting for firstDayOfMonth being 0 (Sunday) to 6 (Saturday)
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 text-center"></div>)
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonthView && today.getDate() === day
      
      // Placeholder for checking real events if they were passed as props
      // const hasEvent = events?.some(event => /* logic to check if event date matches day, currentDate.getMonth(), currentDate.getFullYear() */);
      const hasEvent = false; // Default to false since mock data is removed

      days.push(
        <div
          key={`day-${day}`}
          className={`h-10 text-center relative flex items-center justify-center`}
        >
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
              isToday ? "bg-zinc-800 text-white font-bold" : ""
            } ${hasEvent ? "border border-blue-500" : ""}`} // Example: border if event exists
          >
            {day}
          </span>
          {/* Removed event indicator dot based on mock data */}
          {/* If using real data, you might add an indicator back here based on `hasEvent` */}
          {/* {hasEvent && (
             <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
           )} */}
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

        {/* Removed the "Upcoming Events" section that relied on mock data */}
        {/* Consider adding this back when you have real event data:
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Upcoming Events</h4>
            {events?.filter(event => // filter logic for events in the current view or future )
                   .map((event, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                 <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                 <span className="font-medium">{ // Format event.date properly }</span>
                 <span className="text-zinc-400">-</span>
                 <span>{event.title}</span>
              </div>
            ))}
            {(!events || events.filter(/* filter logic */).length === 0) && (
              <p className="text-sm text-zinc-500">No upcoming events.</p>
            )}
          </div> 
        */}
      </CardContent>
    </Card>
  )
}
