import { Suspense } from "react"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar"
import { DashboardTasks } from "@/components/dashboard/dashboard-tasks"
import { DashboardTimers } from "@/components/dashboard/dashboard-timers"
import { AISummaryCard } from "@/components/ai/ai-summary-card"
import { ErrorBoundary } from "@/components/error-boundary"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ErrorBoundary
          fallback={<div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">Error loading overview</div>}
        >
          <Suspense fallback={<DashboardSkeleton className="col-span-1 lg:col-span-2" />}>
            <DashboardOverview className="col-span-1 lg:col-span-2" />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary
          fallback={<div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">Error loading AI summary</div>}
        >
          <Suspense fallback={<DashboardSkeleton />}>
            <AISummaryCard />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary
          fallback={<div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">Error loading tasks</div>}
        >
          <Suspense fallback={<DashboardSkeleton className="col-span-1 lg:col-span-2" />}>
            <DashboardTasks className="col-span-1 lg:col-span-2" />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary
          fallback={<div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">Error loading calendar</div>}
        >
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardCalendar />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary
          fallback={<div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">Error loading timers</div>}
        >
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardTimers />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}

