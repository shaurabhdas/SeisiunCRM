"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowUpRight, ListTodo } from "lucide-react"
import { getFollowUpColorToken, formatFollowUpDisplay, formatDealValue } from "@/lib/followup"

interface StalledDeal {
  id: string
  opportunity_name: string
  accountName: string
  stage: string
  reported_value: number
  daysSinceContact: number | null
}

interface StalledLead {
  id: string
  opportunity_name: string
  accountName: string
  stage: string
  deal_value: number
  daysSinceContact: number | null
}

interface NeedsAttentionData {
  stalledDeals: { total: number; items: StalledDeal[] }
  stalledLeads: { total: number; items: StalledLead[] }
  overdueTasks: number
}

const EMPTY: NeedsAttentionData = {
  stalledDeals: { total: 0, items: [] },
  stalledLeads: { total: 0, items: [] },
  overdueTasks: 0,
}

export function DashboardNeedsAttention() {
  const router = useRouter()
  const [data, setData] = React.useState<NeedsAttentionData>(EMPTY)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/dashboard/needs-attention')
      .then(res => {
        if (!res.ok) throw new Error("Network response not ok")
        return res.json()
      })
      .then(fetched => {
        setData(fetched)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching needs-attention data:", err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase font-semibold text-muted-foreground">Needs attention</p>
        <Link href="/deals/at-risk" className="flex items-center gap-1 text-xs font-medium text-(--primary) hover:underline">
          View all
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-(--destructive)" />
            <p className="text-xs font-bold text-foreground">Stalled deals</p>
            <span className="text-2xs text-muted-foreground">({data.stalledDeals.total})</span>
          </div>
          <div className="mt-2 space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : data.stalledDeals.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing stalled — nice work.</p>
            ) : (
              data.stalledDeals.items.map(deal => (
                <button
                  key={deal.id}
                  onClick={() => router.push(`/deals/pipeline?deal=${deal.id}`)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{deal.opportunity_name}</span>
                    <span className="block truncate text-2xs text-muted-foreground">{deal.accountName}</span>
                  </span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-3xs font-semibold"
                    style={{ backgroundColor: `var(${getFollowUpColorToken(deal.daysSinceContact)})`, color: "#fff" }}
                  >
                    {formatFollowUpDisplay(deal.daysSinceContact)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-(--destructive)" />
            <p className="text-xs font-bold text-foreground">Stalled leads</p>
            <span className="text-2xs text-muted-foreground">({data.stalledLeads.total})</span>
          </div>
          <div className="mt-2 space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : data.stalledLeads.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing stalled — nice work.</p>
            ) : (
              data.stalledLeads.items.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => router.push(`/leads?lead=${lead.id}`)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{lead.opportunity_name}</span>
                    <span className="block truncate text-2xs text-muted-foreground">{lead.accountName}</span>
                  </span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-3xs font-semibold"
                    style={{ backgroundColor: `var(${getFollowUpColorToken(lead.daysSinceContact)})`, color: "#fff" }}
                  >
                    {formatFollowUpDisplay(lead.daysSinceContact)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <Link
        href="/tasks"
        className="mt-3 flex items-center gap-2 rounded-lg border bg-card/60 px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/30"
      >
        <ListTodo className="size-3.5" />
        <span className="font-semibold uppercase text-3xs tracking-wider">Overdue tasks</span>
        <span className="font-semibold text-foreground">{loading ? "—" : data.overdueTasks}</span>
      </Link>
    </div>
  )
}
