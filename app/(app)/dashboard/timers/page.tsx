import { Suspense } from "react"
import { TimersView } from "@/components/dashboard/timers-view"
import { ErrorBoundary } from "@/components/error-boundary"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function TimersPage() {
  return (
    <div className="p-6">
      <ErrorBoundary
        fallback={<div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">Error loading timers</div>}
      >
        <Suspense fallback={<DashboardSkeleton />}>
          <TimersView />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

