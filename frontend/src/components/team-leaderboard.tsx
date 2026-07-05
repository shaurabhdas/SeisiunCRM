"use client"

import * as React from "react"
import { ArrowUpDown, HelpCircle, ArrowUp, ArrowDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface RepRow {
  name: string
  initials: string
  emails: number
  calls: number
  meetings: number
  score: number // calculated dynamically
}



// Weighted formula: 1 Meeting = 10 pts, 1 Call = 3 pts, 1 Email = 1 pt
function calculateScore(row: Omit<RepRow, "score">): RepRow {
  return {
    ...row,
    score: row.emails * 1 + row.calls * 3 + row.meetings * 10,
  }
}

export function TeamLeaderboard({ timeframe }: { timeframe: string }) {
  const [data, setData] = React.useState<RepRow[]>([])
  const [sortField, setSortField] = React.useState<keyof RepRow>("score")
  const [sortAsc, setSortAsc] = React.useState(false)

  React.useEffect(() => {
    fetch(`/api/team-activity/leaderboard?timeframe=${timeframe}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch leaderboard")
        return res.json()
      })
      .then(fetchedData => {
        const calculated = fetchedData.map(calculateScore)
        setData(calculated)
      })
      .catch(err => console.error("Error loading team leaderboard:", err))
  }, [timeframe])

  const handleSort = (field: keyof RepRow) => {
    const isAsc = sortField === field ? !sortAsc : false
    setSortField(field)
    setSortAsc(isAsc)
  }

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal
      }
      
      return 0
    })
  }, [data, sortField, sortAsc])

  const renderSortIndicator = (field: keyof RepRow) => {
    if (sortField !== field) {
      return <ArrowUpDown className="size-3 text-muted-foreground/60 shrink-0 ml-1" />
    }
    return sortAsc ? (
      <ArrowUp className="size-3 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />
    ) : (
      <ArrowDown className="size-3 text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />
    )
  }

  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h2 className="text-base font-bold text-foreground uppercase tracking-wider">Rep Activity Leaderboard</h2>
          <p className="text-xs text-muted-foreground">Sales reps ranked by outbound volume & engagement scores.</p>
        </div>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-xs uppercase font-semibold">
              <th
                onClick={() => handleSort("name")}
                className="py-3 px-2 cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div className="flex items-center">
                  Rep Name {renderSortIndicator("name")}
                </div>
              </th>
              <th
                onClick={() => handleSort("emails")}
                className="py-3 px-2 cursor-pointer hover:text-foreground transition-colors select-none text-right"
              >
                <div className="flex items-center justify-end">
                  Emails {renderSortIndicator("emails")}
                </div>
              </th>
              <th
                onClick={() => handleSort("calls")}
                className="py-3 px-2 cursor-pointer hover:text-foreground transition-colors select-none text-right"
              >
                <div className="flex items-center justify-end">
                  Calls {renderSortIndicator("calls")}
                </div>
              </th>
              <th
                onClick={() => handleSort("meetings")}
                className="py-3 px-2 cursor-pointer hover:text-foreground transition-colors select-none text-right"
              >
                <div className="flex items-center justify-end">
                  Meetings {renderSortIndicator("meetings")}
                </div>
              </th>
              <th
                onClick={() => handleSort("score")}
                className="py-3 px-2 cursor-pointer hover:text-foreground transition-colors select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Activity Score</span>
                  {renderSortIndicator("score")}
                  {/* Tooltip Icon explaining formula */}
                  <div className="relative group/help cursor-help">
                    <HelpCircle className="size-3 text-muted-foreground/60 hover:text-muted-foreground" />
                    <span className="absolute bottom-full mb-2 right-0 hidden group-hover/help:block z-15 w-52 rounded-md bg-zinc-950 p-2 text-[10px] leading-relaxed text-white shadow-md font-normal lowercase tracking-normal text-left">
                      Weighted score formula:<br />
                      • 1 Email = 1 pt<br />
                      • 1 Call = 3 pts<br />
                      • 1 Meeting = 10 pts
                    </span>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedData.map((rep) => (
              <tr
                key={rep.name}
                className="hover:bg-muted/30 transition-colors group cursor-default"
              >
                <td className="py-3 px-2 font-medium text-foreground flex items-center gap-2.5">
                  <Avatar className="size-6 text-[10px]">
                    <AvatarFallback className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-semibold border">
                      {rep.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span>{rep.name}</span>
                </td>
                <td className="py-3 px-2 text-right text-muted-foreground tabular-nums">
                  {rep.emails.toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right text-muted-foreground tabular-nums">
                  {rep.calls.toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right text-muted-foreground tabular-nums">
                  {rep.meetings}
                </td>
                <td className="py-3 px-2 text-right font-bold text-foreground tabular-nums">
                  {rep.score.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground/60 italic">
        Rep-level breakdown available after authentication is enabled.
      </p>
    </div>
  )
}
