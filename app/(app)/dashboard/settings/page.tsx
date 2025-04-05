import { Suspense } from "react"
import { SettingsView } from "@/components/dashboard/settings-view"
import { ErrorBoundary } from "@/components/error-boundary"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function SettingsPage() {
  return (
    <div className="p-6">
      <ErrorBoundary
        fallback={<div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">Error loading settings</div>}
      >
        <Suspense fallback={<DashboardSkeleton />}>
          <SettingsView />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

