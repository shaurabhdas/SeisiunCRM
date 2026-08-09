"use client"

import * as React from "react"
import { BarChart3 } from "lucide-react"

interface StageConfidenceItem {
  name: string
  confidence: number | null
  count?: number
  insufficientData?: boolean
}

export function PulseConfidence({ refreshKey }: { refreshKey: number }) {
  const [stages, setStages] = React.useState<StageConfidenceItem[]>([])

  React.useEffect(() => {
    fetch('/api/forecast/pulse-stages')
      .then(res => {
        if (!res.ok) throw new Error("Network response not ok")
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setStages(data)
        }
      })
      .catch(err => console.error("Error fetching stage confidence:", err))
  }, [refreshKey])

  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs flex flex-col justify-between h-full min-h-[380px]">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Stage confidence</h2>
            <p className="text-sm text-muted-foreground">Conversion quality by current pipeline stage.</p>
          </div>
          <BarChart3 className="size-5 text-muted-foreground/70" />
        </div>

        <div className="mt-7 grid gap-6">
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            stages.map((stage) => (
              <div key={stage.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{stage.name}</span>
                  {stage.insufficientData ? (
                    <span className="text-muted-foreground/70 italic">
                      Not enough history yet{stage.count ? ` · ${stage.count} in stage` : ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{stage.confidence}% confidence</span>
                  )}
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                  {stage.insufficientData ? (
                    <div className="h-full w-full rounded-full border border-dashed border-muted-foreground/20" />
                  ) : (
                    <div
                      className="h-full rounded-full bg-zinc-950 dark:bg-zinc-100 transition-all duration-500"
                      style={{ width: `${stage.confidence}%` }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 border-t pt-4 text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground">Stage weights:</span> assigned based on historical average conversion rates computed across all CRM opportunity records.
      </div>
    </div>
  )
}
