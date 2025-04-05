import { Suspense } from "react"
import { TasksView } from "@/components/dashboard/tasks-view"
import { ErrorBoundary } from "@/components/error-boundary"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function TasksPage() {
  return (
    <div className="p-6">
      <ErrorBoundary
        fallback={<div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">Error loading tasks</div>}
      >
        <Suspense fallback={<DashboardSkeleton />}>
          <TasksView />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

