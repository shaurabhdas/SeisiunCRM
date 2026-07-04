"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"

interface KPIState {
  bestCase: string
  commit: string
  likelySlip: string
  activeOpportunitiesCount: number
  executiveActionCount: number
}

export function PulseCards({ refreshKey }: { refreshKey: number }) {
  const [kpis, setKpis] = React.useState<KPIState>({
    bestCase: "$621K",
    commit: "$392K",
    likelySlip: "$148K",
    activeOpportunitiesCount: 14,
    executiveActionCount: 5
  })

  React.useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    fetch(`${apiUrl}/forecast/pulse-kpis`)
      .then(res => {
        if (!res.ok) throw new Error("Network response not ok")
        return res.json()
      })
      .then(data => {
        if (data.bestCase && data.commit && data.likelySlip) {
          setKpis(data)
        }
      })
      .catch(err => console.error("Error fetching forecast KPIs:", err))
  }, [refreshKey])

  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-3 lg:px-6">
      {/* Commit Forecast */}
      <Card className="rounded-lg border bg-card p-4 shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">Commit forecast</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{kpis.commit}</p>
        <p className="mt-2 text-sm text-muted-foreground">74% confidence</p>
        <div className="mt-4 inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          +12% from last week
        </div>
      </Card>

      {/* Best Case */}
      <Card className="rounded-lg border bg-card p-4 shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">Best case</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{kpis.bestCase}</p>
        <p className="mt-2 text-sm text-muted-foreground">{kpis.activeOpportunitiesCount} active opportunities</p>
        <div className="mt-4 inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          +$82K newly qualified
        </div>
      </Card>

      {/* Likely Slip */}
      <Card className="rounded-lg border bg-card p-4 shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">Likely slip</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{kpis.likelySlip}</p>
        <p className="mt-2 text-sm text-muted-foreground">{kpis.executiveActionCount} deals need executive action</p>
        <div className="mt-4 inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          2 moved from green to amber
        </div>
      </Card>
    </div>
  )
}
