"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"

interface KPIState {
  bestCase: string
  commit: string
  likelySlip: string
  activeOpportunitiesCount: number
  slippingDealsCount: number
  confidence: number
  commitIndicator: string
  newlyQualifiedValue: number
}

const formatK = (val: number) => `$${Math.round(val / 1000)}K`

export function PulseCards({ refreshKey }: { refreshKey: number }) {
  const [kpis, setKpis] = React.useState<KPIState>({
    bestCase: "—",
    commit: "—",
    likelySlip: "—",
    activeOpportunitiesCount: 0,
    slippingDealsCount: 0,
    confidence: 0,
    commitIndicator: "",
    newlyQualifiedValue: 0
  })

  React.useEffect(() => {
    fetch('/api/forecast/pulse-kpis')
      .then(res => {
        if (!res.ok) throw new Error("Network response not ok")
        return res.json()
      })
      .then(data => {
        setKpis({
          bestCase: data.bestCase || "—",
          commit: data.commit || "—",
          likelySlip: data.likelySlip || "—",
          activeOpportunitiesCount: data.activeOpportunitiesCount || 0,
          slippingDealsCount: data.slippingDealsCount || 0,
          confidence: data.confidence || 0,
          commitIndicator: data.commitIndicator || "",
          newlyQualifiedValue: data.newlyQualifiedValue || 0
        })
      })
      .catch(err => console.error("Error fetching forecast KPIs:", err))
  }, [refreshKey])

  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-3 lg:px-6">
      {/* Commit Forecast */}
      <Card className="rounded-lg border bg-card p-4 shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">Commit forecast</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{kpis.commit}</p>
        <p className="mt-2 text-sm text-muted-foreground">{kpis.confidence}% confidence</p>
        {kpis.commitIndicator && (
          <div className="mt-4 inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {kpis.commitIndicator}
          </div>
        )}
      </Card>

      {/* Best Case */}
      <Card className="rounded-lg border bg-card p-4 shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">Best case</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{kpis.bestCase}</p>
        <p className="mt-2 text-sm text-muted-foreground">{kpis.activeOpportunitiesCount} active opportunities</p>
        {kpis.newlyQualifiedValue > 0 && (
          <div className="mt-4 inline-block rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            +{formatK(kpis.newlyQualifiedValue)} newly qualified
          </div>
        )}
      </Card>

      {/* Likely Slip */}
      <Card className="rounded-lg border bg-card p-4 shadow-xs">
        <p className="text-sm font-medium text-muted-foreground">Likely slip</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{kpis.likelySlip}</p>
        {kpis.slippingDealsCount > 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {kpis.slippingDealsCount} deal{kpis.slippingDealsCount !== 1 ? 's' : ''} closing soon with no recent contact
          </p>
        ) : (
          <p className="mt-2 text-sm text-emerald-600/70 dark:text-emerald-400/70">
            No slipping deals this week
          </p>
        )}
      </Card>
    </div>
  )
}
