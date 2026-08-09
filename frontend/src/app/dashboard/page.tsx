"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DashboardRevenueCards } from "@/components/dashboard-revenue-cards"
import { DashboardTeamPerformance } from "@/components/dashboard-team-performance"
import { DashboardAccountsPulse } from "@/components/dashboard-accounts-pulse"
import { DashboardNeedsAttention } from "@/components/dashboard-needs-attention"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PERIOD_LABELS: Record<string, string> = {
  "today": "Today",
  "this-week": "This Week",
  "this-month": "This Month",
  "this-year": "This Year",
  "all-time": "All Time",
}

export default function Page() {
  const [timeframe, setTimeframe] = React.useState("this-week")

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
          {/* Header section with period selector */}
          <div className="flex flex-col gap-4 px-4 pt-6 md:flex-row md:items-center md:justify-between lg:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company pulse</p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight md:text-3xl text-foreground">
                Where the business stands right now.
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Period:</span>
              <Select value={timeframe} onValueChange={(val) => setTimeframe(val || "this-week")}>
                <SelectTrigger className="w-[160px] bg-card border shadow-2xs text-sm rounded-lg">
                  <SelectValue placeholder="Select period">
                    {(value: string) => PERIOD_LABELS[value] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="today" className="rounded-md">Today</SelectItem>
                  <SelectItem value="this-week" className="rounded-md">This Week</SelectItem>
                  <SelectItem value="this-month" className="rounded-md">This Month</SelectItem>
                  <SelectItem value="this-year" className="rounded-md">This Year</SelectItem>
                  <SelectItem value="all-time" className="rounded-md">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-8 py-6 animate-fade-in">
              <DashboardRevenueCards timeframe={timeframe} />
              <DashboardTeamPerformance timeframe={timeframe} />
              <DashboardAccountsPulse timeframe={timeframe} />
              <DashboardNeedsAttention />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
