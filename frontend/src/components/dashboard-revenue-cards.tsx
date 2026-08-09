"use client"

import * as React from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { TrendingUp, Trophy, Target, Layers, ArrowUpRight } from "lucide-react"

interface RevenueKPIs {
  newLeads: { count: number; value: number }
  dealsWon: { count: number; value: number }
  dealsLost: { count: number; value: number }
  winRate: number | null
  openPipelineValue: number
  activityCounts: { calls: number; emails: number; meetings: number; total: number }
}

const formatK = (val: number) => `$${Math.round(val / 1000)}K`

const EMPTY: RevenueKPIs = {
  newLeads: { count: 0, value: 0 },
  dealsWon: { count: 0, value: 0 },
  dealsLost: { count: 0, value: 0 },
  winRate: null,
  openPipelineValue: 0,
  activityCounts: { calls: 0, emails: 0, meetings: 0, total: 0 },
}

export function DashboardRevenueCards({ timeframe }: { timeframe: string }) {
  const [data, setData] = React.useState<RevenueKPIs>(EMPTY)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard/revenue-kpis?timeframe=${timeframe}`)
      .then(res => {
        if (!res.ok) throw new Error("Network response not ok")
        return res.json()
      })
      .then(fetched => {
        setData(fetched)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching revenue KPIs:", err)
        setLoading(false)
      })
  }, [timeframe])

  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase font-semibold text-muted-foreground">Money &amp; growth</p>
        <Link
          href="/dashboard/forecast-pulse"
          className="flex items-center gap-1 text-xs font-medium text-(--primary) hover:underline"
        >
          Full forecast breakdown
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Deals won</p>
            <Trophy className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{loading ? "—" : formatK(data.dealsWon.value)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{data.dealsWon.count} deal{data.dealsWon.count !== 1 ? "s" : ""} closed won</p>
        </Card>

        <Card className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Win rate</p>
            <TrendingUp className="size-4 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {loading || data.winRate === null ? "—" : `${data.winRate}%`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.dealsWon.count + data.dealsLost.count > 0
              ? `${data.dealsWon.count} won / ${data.dealsLost.count} lost`
              : "No closed deals yet"}
          </p>
        </Card>

        <Card className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">New leads</p>
            <Target className="size-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{loading ? "—" : data.newLeads.count}</p>
          <p className="mt-2 text-sm text-muted-foreground">{formatK(data.newLeads.value)} in new pipeline</p>
        </Card>

        <Card className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Open pipeline</p>
            <Layers className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{loading ? "—" : formatK(data.openPipelineValue)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Across active leads &amp; deals</p>
        </Card>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border bg-card/60 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-semibold uppercase text-3xs tracking-wider">Activity this period</span>
        <span>{data.activityCounts.calls} calls</span>
        <span>{data.activityCounts.emails} emails</span>
        <span>{data.activityCounts.meetings} meetings</span>
      </div>
    </div>
  )
}
