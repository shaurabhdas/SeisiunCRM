"use client"

import * as React from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, ArrowUpRight } from "lucide-react"

interface TeamRow {
  id: string
  name: string
  role: string
  activities: number
  leadsOwned: number
  dealsOwned: { count: number; value: number }
  dealsWon: { count: number; value: number }
  winRate: number | null
}

const formatK = (val: number) => `$${Math.round(val / 1000)}K`

const initialsOf = (name: string) =>
  name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"

export function DashboardTeamPerformance({ timeframe }: { timeframe: string }) {
  const [rows, setRows] = React.useState<TeamRow[]>([])
  const [isTeamView, setIsTeamView] = React.useState(true)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard/team-performance?timeframe=${timeframe}`)
      .then(res => {
        if (!res.ok) throw new Error("Network response not ok")
        return res.json()
      })
      .then(fetched => {
        setRows(fetched.rows || [])
        setIsTeamView(fetched.isTeamView)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching team performance:", err)
        setLoading(false)
      })
  }, [timeframe])

  if (!isTeamView) {
    const mine = rows[0]
    return (
      <div className="px-4 lg:px-6">
        <p className="text-xs uppercase font-semibold text-muted-foreground">Your performance</p>
        <div className="mt-3 rounded-lg border bg-card p-5 shadow-xs">
          {loading || !mine ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-semibold text-foreground">{mine.activities}</p>
                <p className="text-xs text-muted-foreground">Activities logged</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{mine.leadsOwned}</p>
                <p className="text-xs text-muted-foreground">Leads owned</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{formatK(mine.dealsOwned.value)}</p>
                <p className="text-xs text-muted-foreground">{mine.dealsOwned.count} open deal{mine.dealsOwned.count !== 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{formatK(mine.dealsWon.value)}</p>
                <p className="text-xs text-muted-foreground">{mine.dealsWon.count} won this period</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase font-semibold text-muted-foreground">Team performance</p>
        <Link
          href="/dashboard/team-activity"
          className="flex items-center gap-1 text-xs font-medium text-(--primary) hover:underline"
        >
          View full team report
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <div className="mt-3 rounded-lg border bg-card shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Rep</th>
              <th className="p-3">Activities</th>
              <th className="p-3">Leads owned</th>
              <th className="p-3">Deals owned</th>
              <th className="p-3">Won this period</th>
              <th className="p-3">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No team members found.</td></tr>
            ) : (
              rows.map(row => (
                <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-3xs">{initialsOf(row.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{row.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{row.activities}</td>
                  <td className="p-3 text-muted-foreground">{row.leadsOwned}</td>
                  <td className="p-3 text-muted-foreground">{formatK(row.dealsOwned.value)} ({row.dealsOwned.count})</td>
                  <td className="p-3 font-medium text-foreground">{formatK(row.dealsWon.value)} ({row.dealsWon.count})</td>
                  <td className="p-3 text-muted-foreground">{row.winRate === null ? "—" : `${row.winRate}%`}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
