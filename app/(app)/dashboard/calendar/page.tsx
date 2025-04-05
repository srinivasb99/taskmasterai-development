import { Suspense } from "react"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { ErrorBoundary } from "@/components/error-boundary"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function CalendarPage() {
  return (
    <div className="p-6">
      <ErrorBoundary
        fallback={<div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">Error loading calendar</div>}
      >
        <Suspense fallback={<DashboardSkeleton />}>
          <CalendarView />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

