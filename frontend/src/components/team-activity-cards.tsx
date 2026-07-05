"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Mail, Phone, Calendar, FileText } from "lucide-react"

interface KPIItem {
  value: string
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
    emails: { label: "Total Emails Sent", value: "—", icon: <Mail className="size-4 text-sky-600 dark:text-sky-400" /> },
    calls: { label: "Total Calls Made", value: "—", icon: <Phone className="size-4 text-emerald-600 dark:text-emerald-400" /> },
    meetings: { label: "Meetings Booked", value: "—", icon: <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" /> },
    proposals: { label: "Proposals Sent", value: "—", icon: <FileText className="size-4 text-amber-600 dark:text-amber-400" /> },
  })

  React.useEffect(() => {
    fetch(`/api/team-activity/kpis?timeframe=${timeframe}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch KPIs")
        return res.json()
      })
      .then(fetchedData => {
        setData({
          emails: { label: fetchedData.emails?.label || "Total Emails Sent", value: fetchedData.emails?.value || "0", icon: <Mail className="size-4 text-sky-600 dark:text-sky-400" /> },
          calls: { label: fetchedData.calls?.label || "Total Calls Made", value: fetchedData.calls?.value || "0", icon: <Phone className="size-4 text-emerald-600 dark:text-emerald-400" /> },
          meetings: { label: fetchedData.meetings?.label || "Meetings Booked", value: fetchedData.meetings?.value || "0", icon: <Calendar className="size-4 text-indigo-600 dark:text-indigo-400" /> },
          proposals: { label: fetchedData.proposals?.label || "Proposals Sent", value: fetchedData.proposals?.value || "0", icon: <FileText className="size-4 text-amber-600 dark:text-amber-400" /> },
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
        </Card>
      ))}
    </div>
  )
}
