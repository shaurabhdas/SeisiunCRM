"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { TeamActivityCards } from "@/components/team-activity-cards"
import { TeamDailyChart } from "@/components/team-daily-chart"
import { TeamLeaderboard } from "@/components/team-leaderboard"
import { DormantAccounts } from "@/components/dormant-accounts"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
          {/* Header section with page-level timeframe selector */}
          <div className="flex flex-col gap-4 px-4 pt-6 md:flex-row md:items-center md:justify-between lg:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team activity overview</p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight md:text-3xl text-foreground">
                Revenue Execution Volume
              </h1>
            </div>
            
            {/* Page-level Filter Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Timeframe:</span>
              <Select value={timeframe} onValueChange={(val) => setTimeframe(val || "this-week")}>
                <SelectTrigger className="w-[180px] bg-card border shadow-2xs text-sm rounded-lg">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="this-week" className="rounded-md">This Week</SelectItem>
                  <SelectItem value="last-week" className="rounded-md">Last Week</SelectItem>
                  <SelectItem value="month-to-date" className="rounded-md">Month-to-Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid Layout containing cards, chart, leaderboard and dormant workspace */}
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 py-6 animate-fade-in">
              {/* Horizontal KPI Cards */}
              <TeamActivityCards timeframe={timeframe} />
              
              {/* Bottom Multi-Column Layout */}
              <div className="px-4 lg:px-6">
                <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  {/* Left Column: Line Chart and Leaderboard */}
                  <div className="space-y-6">
                    <TeamDailyChart timeframe={timeframe} />
                    <TeamLeaderboard timeframe={timeframe} />
                  </div>
                  
                  {/* Right Column: Actionable Dormant Accounts Panel */}
                  <div>
                    <DormantAccounts />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
