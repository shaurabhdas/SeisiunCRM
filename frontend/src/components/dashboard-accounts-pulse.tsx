"use client"

import * as React from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Building2, ArrowUpRight } from "lucide-react"
import { DormantAccounts } from "@/components/dormant-accounts"

interface TopAccount {
  id: string
  name: string
  openPipelineValue: number
}

interface AccountsPulseData {
  totalAccounts: number
  newAccounts: number
  topAccounts: TopAccount[]
}

const formatK = (val: number) => `$${Math.round(val / 1000)}K`

export function DashboardAccountsPulse({ timeframe }: { timeframe: string }) {
  const [data, setData] = React.useState<AccountsPulseData>({ totalAccounts: 0, newAccounts: 0, topAccounts: [] })
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard/accounts-pulse?timeframe=${timeframe}`)
      .then(res => {
        if (!res.ok) throw new Error("Network response not ok")
        return res.json()
      })
      .then(fetched => {
        setData(fetched)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching accounts pulse:", err)
        setLoading(false)
      })
  }, [timeframe])

  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase font-semibold text-muted-foreground">Accounts</p>
        <Link href="/accounts" className="flex items-center gap-1 text-xs font-medium text-(--primary) hover:underline">
          View all accounts
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <div className="mt-3 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-lg border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total accounts</p>
                <Building2 className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{loading ? "—" : data.totalAccounts}</p>
            </Card>
            <Card className="rounded-lg border bg-card p-4 shadow-xs">
              <p className="text-sm font-medium text-muted-foreground">New this period</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{loading ? "—" : data.newAccounts}</p>
            </Card>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-xs">
            <p className="text-xs uppercase font-semibold text-muted-foreground">Top accounts by open pipeline</p>
            <div className="mt-3 space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : data.topAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open pipeline yet.</p>
              ) : (
                data.topAccounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-foreground">{acc.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatK(acc.openPipelineValue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DormantAccounts />
      </div>
    </div>
  )
}
