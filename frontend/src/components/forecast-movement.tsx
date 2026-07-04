"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"

export function ForecastMovement() {
  const deals = [
    {
      name: "Northstar Labs",
      description: "Legal has a fixed review window and the champion confirmed budget.",
      value: "$96K",
      category: "Commit",
      nextAction: "Send redline summary today"
    },
    {
      name: "Mercury Retail",
      description: "No technical stakeholder meeting is booked after discovery.",
      value: "$118K",
      category: "Slip Risk",
      nextAction: "Schedule technical discovery"
    },
    {
      name: "RelayWorks",
      description: "Pilot success criteria are clear and procurement is already engaged.",
      value: "$74K",
      category: "Upside",
      nextAction: "Confirm approval path"
    },
    {
      name: "AtlasBio",
      description: "Champion changed roles and there is no replacement buyer mapped.",
      value: "$52K",
      category: "At Risk",
      nextAction: "Identify new economic buyer"
    }
  ]

  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Forecast movement</h2>
          <p className="text-sm text-muted-foreground">The deals that changed forecast quality this week.</p>
        </div>
        <TriangleAlert className="size-5 text-amber-600" />
      </div>

      <div className="mt-5 space-y-3">
        {deals.map((deal) => (
          <div key={deal.name} className="rounded-md border bg-background p-4 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{deal.name}</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{deal.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-foreground">{deal.value}</p>
                <p className="text-xs text-muted-foreground">{deal.category}</p>
              </div>
            </div>
            <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 dark:bg-sky-950/20 dark:text-sky-400">
              Next action: {deal.nextAction}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
