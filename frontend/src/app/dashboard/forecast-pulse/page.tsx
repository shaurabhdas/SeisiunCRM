"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { PulseCards } from "@/components/pulse-cards"
import { PipelineActivity } from "@/components/pipeline-activity"
import { PulseConfidence } from "@/components/pulse-confidence"
import { DetailedPipeline } from "@/components/detailed-pipeline"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TrendingUp, TrendingDown } from "lucide-react"

export default function Page() {
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [commitIndicator, setCommitIndicator] = React.useState("")

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  React.useEffect(() => {
    fetch('/api/forecast/pulse-kpis')
      .then(res => res.json())
      .then(data => {
        setCommitIndicator(data.commitIndicator || "")
      })
      .catch(() => {})
  }, [refreshKey])

  const isUp = commitIndicator.startsWith("Commit up")
  const isDown = commitIndicator.startsWith("Commit down")

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col bg-[#f7f7f2] dark:bg-zinc-950/40 pb-10">
          {/* Header section with badge */}
          <div className="flex flex-col gap-4 px-4 pt-6 md:flex-row md:items-center md:justify-between lg:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manager forecast view</p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight md:text-3xl text-foreground">
                Know what is commit, what is upside, and what is about to slip.
              </h1>
            </div>
            {commitIndicator && (
              <div className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                isDown
                  ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
              }`}>
                {isDown ? (
                  <TrendingDown className="size-3.5 text-red-600 dark:text-red-400" />
                ) : (
                  <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>{commitIndicator}</span>
              </div>
            )}
          </div>

          {/* Grid Layout containing cards, table, and confidence progress */}
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 py-6 animate-fade-in">
              <PulseCards refreshKey={refreshKey} />
              
              <div className="px-4 lg:px-6">
                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr] mb-6">
                  <PipelineActivity refreshKey={refreshKey} />
                  <PulseConfidence refreshKey={refreshKey} />
                </div>
                <DetailedPipeline refreshKey={refreshKey} onRefresh={handleRefresh} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
