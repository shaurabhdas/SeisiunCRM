"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { TrendingUp, Mail, Phone, Calendar, FileText } from "lucide-react"

interface KPIItem {
  value: string
  trend: string
  outcome: string
  label: string
  icon: React.ReactNode
}

interface CardsData {
  emails: KPIItem
  calls: KPIItem
  meetings: KPIItem
  proposals: KPIItem
}

export function TeamActivityCards({ timeframe }: { timeframe: string }) {
  const [data, setData] = React.useState<CardsData>({
    emails: { label: "Total Emails Sent", value: "1,240", trend: "+12.4%", outcome: "14.2% reply rate", icon: <Mail className="size-4 text-sky-600 dark:text-sky-400" /> },
    calls: { label: "Total Calls Made", value: "410", trend: "+8.2%", outcome: "8.5% connect rate", icon: <Phone className="size-4 text-emerald-600 dark:text-emerald-400" /> },
    meetings: { label: "Meetings Booked", value: "18", trend: "+18.5%", outcome: "94% show rate", icon: <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" /> },
    proposals: { label: "Proposals Sent", value: "5", trend: "+5.3%", outcome: "60% win rate", icon: <FileText className="size-4 text-amber-600 dark:text-amber-400" /> },
  })

  React.useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    fetch(`${apiUrl}/team-activity/kpis?timeframe=${timeframe}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch KPIs")
        return res.json()
      })
      .then(fetchedData => {
        setData({
          emails: { ...fetchedData.emails, icon: <Mail className="size-4 text-sky-600 dark:text-sky-400" /> },
          calls: { ...fetchedData.calls, icon: <Phone className="size-4 text-emerald-600 dark:text-emerald-400" /> },
          meetings: { ...fetchedData.meetings, icon: <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" /> },
          proposals: { ...fetchedData.proposals, icon: <FileText className="size-4 text-amber-600 dark:text-amber-400" /> },
        })
      })
      .catch(err => console.error("Error loading team activity KPIs:", err))
  }, [timeframe])

  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-4 lg:px-6">
      {Object.entries(data).map(([key, item]) => (
        <Card key={key} className="rounded-lg border bg-card p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
            <div className="flex size-7 items-center justify-center rounded-md bg-muted/40 border">
              {item.icon}
            </div>
          </div>
          
          <p className="mt-3.5 text-3xl font-bold tracking-tight text-foreground">{item.value}</p>
          
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t pt-3.5">
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-3.5" />
              <span>{item.trend} velocity</span>
            </div>
            
            <span className="rounded bg-sky-50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-400 border border-sky-100/40 dark:border-sky-900/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              {item.outcome}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
