"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { PulseCards } from "@/components/pulse-cards"
import { PipelineActivity } from "@/components/pipeline-activity"
import { PulseConfidence } from "@/components/pulse-confidence"
import { DetailedPipeline } from "@/components/detailed-pipeline"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TrendingUp, TrendingDown, ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function Page() {
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [commitIndicator, setCommitIndicator] = React.useState("")
  const [canView, setCanView] = React.useState<boolean | null>(null)

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setCanView(false); return }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setCanView(profile?.role === 'super_admin' || profile?.role === 'manager')
    })
  }, [])

  React.useEffect(() => {
    if (!canView) return
    fetch('/api/forecast/pulse-kpis')
      .then(res => res.json())
      .then(data => {
        setCommitIndicator(data.commitIndicator || "")
      })
      .catch(() => {})
  }, [refreshKey, canView])

  const isUp = commitIndicator.startsWith("Commit up")
  const isDown = commitIndicator.startsWith("Commit down")

  if (canView === false) {
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
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#f7f7f2] dark:bg-zinc-950/40 p-10 text-center">
            <ShieldAlert className="size-8 text-muted-foreground" />
            <h1 className="text-lg font-bold text-foreground">Manager access only</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Forecast Pulse shows company-wide pipeline and forecast data, so it's restricted to managers and admins.
            </p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (canView === null) {
    return null
  }

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
