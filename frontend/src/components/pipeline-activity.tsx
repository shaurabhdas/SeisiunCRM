"use client"

import * as React from "react"
import { ArrowUpRight, AlertTriangle, Target, ArrowRight } from "lucide-react"
import { getFollowUpColorToken, formatFollowUpDisplay } from "@/lib/followup"

interface AdvanceItem {
  opportunityName: string
  accountName: string
  fromStage: string
  toStage: string
  changedAt: string
}

interface StalledItem {
  opportunityName: string
  accountName: string
  stage: string
  daysSinceContact: number | null
}

interface NewToDemoItem {
  opportunityName: string
  accountName: string
  stage: string
  reachedAt: string
}

interface ActivityData {
  advances: AdvanceItem[]
  stalled: StalledItem[]
  newToDemo: NewToDemoItem[]
}

export function PipelineActivity({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = React.useState<ActivityData>({
    advances: [],
    stalled: [],
    newToDemo: []
  })
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setLoading(true)
    fetch('/api/forecast/pulse-activity')
      .then(res => {
        if (!res.ok) throw new Error("Network response not ok")
        return res.json()
      })
      .then(fetched => {
        setData(fetched)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching pipeline activity:", err)
        setLoading(false)
      })
  }, [refreshKey])

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-5 shadow-xs flex flex-col justify-center items-center h-full min-h-[380px]">
        <div className="text-sm text-muted-foreground animate-pulse">Loading pipeline activity...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Pipeline Activity</h2>
            <p className="text-sm text-muted-foreground">What moved, what stalled, and what is ready to close this week.</p>
          </div>
        </div>

        {/* Section 1: Stage Advances */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="size-4.5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Stage Advances</h3>
          </div>
          
          {data.advances.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-6.5 py-1">No stage changes this week.</p>
          ) : (
            <div className="space-y-2 pl-6.5">
              {data.advances.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-muted last:border-0">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-bold text-foreground truncate">{item.opportunityName}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.accountName}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-neutral-100 dark:bg-neutral-800 text-3xs font-semibold uppercase px-1.5 py-0.5 text-muted-foreground">
                        {item.fromStage}
                      </span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="rounded bg-neutral-100 dark:bg-neutral-800 text-3xs font-semibold uppercase px-1.5 py-0.5 text-muted-foreground">
                        {item.toStage}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground min-w-[45px] text-right font-medium">
                      {formatDate(item.changedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border/45 my-4" />

        {/* Section 2: Stalled */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4.5 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Stalled</h3>
          </div>

          {data.stalled.length === 0 ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 italic pl-6.5 py-1">No stalled opportunities.</p>
          ) : (
            <div className="space-y-2 pl-6.5">
              {data.stalled.map((item, idx) => {
                const followColor = getFollowUpColorToken(item.daysSinceContact)
                const followDisplay = formatFollowUpDisplay(item.daysSinceContact)

                return (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-muted last:border-0">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-sm font-bold text-foreground truncate">{item.opportunityName}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.accountName}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="rounded bg-neutral-100 dark:bg-neutral-800 text-3xs font-semibold uppercase px-1.5 py-0.5 text-muted-foreground">
                        {item.stage}
                      </span>
                      <div className="flex items-center gap-1.5 min-w-[55px] justify-end">
                        <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: `var(${followColor})` }} />
                        <span className="text-xs text-muted-foreground font-medium">{followDisplay}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border/45 my-4" />

        {/* Section 3: New to Demo or Evaluating */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="size-4.5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-semibold text-foreground">New to Demo or Evaluating</h3>
          </div>

          {data.newToDemo.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-6.5 py-1">No new opportunities reached demo stage this week.</p>
          ) : (
            <div className="space-y-2 pl-6.5">
              {data.newToDemo.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-muted last:border-0">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-sm font-bold text-foreground truncate">{item.opportunityName}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.accountName}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded bg-neutral-100 dark:bg-neutral-800 text-3xs font-semibold uppercase px-1.5 py-0.5 text-muted-foreground">
                      {item.stage}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      reached {formatDate(item.reachedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
