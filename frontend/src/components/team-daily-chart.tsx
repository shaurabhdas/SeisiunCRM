"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const thisWeekData = [
  { name: "Mon", emails: 28, calls: 18 },
  { name: "Tue", emails: 85, calls: 42 },
  { name: "Wed", emails: 30, calls: 12 },
  { name: "Thu", emails: 72, calls: 48 },
  { name: "Fri", emails: 55, calls: 38 },
  { name: "Sat", emails: 60, calls: 86 },
  { name: "Sun", emails: 85, calls: 50 },
]

const lastWeekData = [
  { name: "Mon", emails: 40, calls: 22 },
  { name: "Tue", emails: 65, calls: 30 },
  { name: "Wed", emails: 35, calls: 15 },
  { name: "Thu", emails: 88, calls: 52 },
  { name: "Fri", emails: 62, calls: 40 },
  { name: "Sat", emails: 45, calls: 70 },
  { name: "Sun", emails: 50, calls: 36 },
]

const monthToDateData = [
  { name: "Wk 1", emails: 850, calls: 290 },
  { name: "Wk 2", emails: 1240, calls: 410 },
  { name: "Wk 3", emails: 1450, calls: 520 },
  { name: "Wk 4", emails: 1280, calls: 360 },
]

const chartConfig = {
  emails: {
    label: "Emails Sent",
    color: "oklch(0.609 0.126 221.72)", // Sky blue
  },
  calls: {
    label: "Calls Made",
    color: "oklch(0.708 0.115 150.117)", // Emerald green
  },
} satisfies ChartConfig

export function TeamDailyChart({ timeframe }: { timeframe: string }) {
  const [chartData, setChartData] = React.useState(thisWeekData)
  const [showEmails, setShowEmails] = React.useState(true)
  const [showCalls, setShowCalls] = React.useState(true)

  React.useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    fetch(`${apiUrl}/team-activity/daily-chart?timeframe=${timeframe}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch chart data")
        return res.json()
      })
      .then(data => {
        setChartData(data)
      })
      .catch(err => console.error("Error loading team daily chart:", err))
  }, [timeframe])

  return (
    <Card className="@container/card border bg-card shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-bold text-foreground uppercase tracking-wider">Daily Activity Volume</CardTitle>
          <CardDescription>Visualizing mix of outbound emails and calls.</CardDescription>
        </div>
        
        {/* Toggle Controls for Legend */}
        <CardAction className="flex items-center gap-2">
          <button
            onClick={() => setShowEmails(!showEmails)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer ${
              showEmails
                ? "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/30"
                : "bg-muted text-muted-foreground border-transparent opacity-60"
            }`}
          >
            <span className="size-2 rounded-full bg-[oklch(0.609_0.126_221.72)]" />
            Emails
          </button>
          <button
            onClick={() => setShowCalls(!showCalls)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer ${
              showCalls
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30"
                : "bg-muted text-muted-foreground border-transparent opacity-60"
            }`}
          >
            <span className="size-2 rounded-full bg-[oklch(0.708_0.115_150.117)]" />
            Calls
          </button>
        </CardAction>
      </CardHeader>
      
      <CardContent className="px-2 pt-4 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillEmails" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(0.609 0.126 221.72)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.609 0.126 221.72)"
                  stopOpacity={0.01}
                />
              </linearGradient>
              <linearGradient id="fillCalls" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(0.708 0.115 150.117)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.708 0.115 150.117)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.15} />
            
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            />
            
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            />
            
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(label) => `Day: ${label}`}
                />
              }
            />
            
            {showEmails && (
              <Area
                dataKey="emails"
                type="monotone"
                fill="url(#fillEmails)"
                stroke="oklch(0.609 0.126 221.72)"
                strokeWidth={2}
                name="emails"
              />
            )}
            
            {showCalls && (
              <Area
                dataKey="calls"
                type="monotone"
                fill="url(#fillCalls)"
                stroke="oklch(0.708 0.115 150.117)"
                strokeWidth={2}
                name="calls"
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
