"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2026-04-01", revenue: 8000, target: 10000 },
  { date: "2026-04-08", revenue: 9500, target: 10000 },
  { date: "2026-04-15", revenue: 11000, target: 10000 },
  { date: "2026-04-22", revenue: 10500, target: 10000 },
  { date: "2026-04-29", revenue: 12500, target: 10000 },
  { date: "2026-05-06", revenue: 9000, target: 12000 },
  { date: "2026-05-13", revenue: 11500, target: 12000 },
  { date: "2026-05-20", revenue: 13000, target: 12000 },
  { date: "2026-05-27", revenue: 14500, target: 12000 },
  { date: "2026-06-03", revenue: 11000, target: 15000 },
  { date: "2026-06-10", revenue: 13500, target: 15000 },
  { date: "2026-06-17", revenue: 15800, target: 15000 },
  { date: "2026-06-24", revenue: 16200, target: 15000 },
]

const chartConfig = {
  sales: {
    label: "Sales Quota",
  },
  revenue: {
    label: "Revenue ($)",
    color: "oklch(0.585 0.233 277.117)", // Indigo/Accent
  },
  target: {
    label: "Target ($)",
    color: "oklch(0.708 0.115 150.117)", // Greenish-Muted
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2026-06-24")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card border-indigo-500/10 dark:bg-card/40 dark:backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">Sales Quota Performance</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Weekly sales revenue compared to target goals
          </span>
          <span className="@[540px]/card:hidden">Revenue vs. Target</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setTimeRange(value[0] ?? "90d")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setTimeRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="oklch(0.585 0.233 277.117)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="oklch(0.585 0.233 277.117)"
                  stopOpacity={0.01}
                />
              </linearGradient>
              <linearGradient id="fillTarget" x1="0" y1="0" x2="0" y2="1">
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
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="target"
              type="monotone"
              fill="url(#fillTarget)"
              stroke="oklch(0.708 0.115 150.117)"
              strokeWidth={2}
              stackId="b"
            />
            <Area
              dataKey="revenue"
              type="monotone"
              fill="url(#fillRevenue)"
              stroke="oklch(0.585 0.233 277.117)"
              strokeWidth={2.5}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
