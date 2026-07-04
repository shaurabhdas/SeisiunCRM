"use client"

import * as React from "react"
import { Settings, Mail, Phone, Check, RefreshCw, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface AccountRow {
  id: string
  name: string
  value: string
  valueNumeric: number
  lastActivity: string
  days: number
}

const initialAccounts: AccountRow[] = [
  { id: "1", name: "Northstar Labs", value: "$996K", valueNumeric: 996000, lastActivity: "2026-06-06", days: 10 },
  { id: "2", name: "Mercury Retail (Midwest)", value: "$118K", valueNumeric: 118000, lastActivity: "2026-06-12", days: 4 },
  { id: "3", name: "Mercury Retail (South)", value: "$118K", valueNumeric: 118000, lastActivity: "2026-06-13", days: 3 },
  { id: "4", name: "Mercury Retail (East)", value: "$108K", valueNumeric: 108000, lastActivity: "2026-06-13", days: 3 },
  { id: "5", name: "Mercury Retail (West)", value: "$118K", valueNumeric: 118000, lastActivity: "2026-06-15", days: 1 },
]

export function DormantAccounts() {
  const [accounts, setAccounts] = React.useState<AccountRow[]>([])
  const [showSettings, setShowSettings] = React.useState(false)
  const [slaDays, setSlaDays] = React.useState(1) // filter accounts with days >= slaDays
  const [loading, setLoading] = React.useState(true)

  const fetchAccounts = () => {
    setLoading(true)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    fetch(`${apiUrl}/team-activity/dormant-accounts`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch dormant accounts")
        return res.json()
      })
      .then(data => {
        setAccounts(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error loading dormant accounts:", err)
        setLoading(false)
      })
  }

  React.useEffect(() => {
    fetchAccounts()
  }, [])

  // Filter accounts based on SLA threshold slider
  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((acc) => acc.days >= slaDays)
  }, [accounts, slaDays])

  // Recalculate summary totals dynamically
  const exposureTotals = React.useMemo(() => {
    const totalVal = filteredAccounts.reduce((sum, acc) => sum + acc.valueNumeric, 0)
    const avgDays = filteredAccounts.length > 0 
      ? Math.round((filteredAccounts.reduce((sum, acc) => sum + acc.days, 0) / filteredAccounts.length) * 10) / 10
      : 0
    return {
      valueFormatted: `$${(totalVal / 1000).toFixed(0)}K`,
      avgDays
    }
  }, [filteredAccounts])

  const handleAction = (id: string, actionType: "email" | "call" | "dismiss", name: string) => {
    if (actionType === "dismiss") {
      setAccounts((prev) => prev.filter((acc) => acc.id !== id))
      toast.success(`Account "${name}" dismissed from dormant queue.`)
    } else if (actionType === "email") {
      toast.success(`Email draft created for "${name}".`)
    } else if (actionType === "call") {
      toast.info(`Dialer launched for "${name}".`)
    }
  }

  const handleReset = () => {
    fetchAccounts()
    setSlaDays(1)
    toast.success("Dormant account queue reloaded from DB.")
  }

  const getBadgeStyle = (days: number) => {
    if (days >= 8) {
      return "bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
    }
    if (days >= 4) {
      return "bg-orange-50 text-orange-800 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30"
    }
    return "bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
  }

  const getBadgeText = (days: number) => {
    if (days >= 8) return "Critical Risk"
    if (days >= 4) return "Stale"
    return "Dormant"
  }

  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs flex flex-col justify-between h-full min-h-[460px]">
      <div>
        {/* Header section */}
        <div className="flex items-center justify-between pb-3 border-b relative">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-foreground uppercase tracking-wider">Dormant Accounts</h2>
              <span className="flex size-5 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                {filteredAccounts.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Accounts requiring prompt follow-up.</p>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleReset}
              title="Reset list"
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground border transition-colors cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground border transition-colors cursor-pointer ${
                showSettings ? "bg-muted text-foreground" : ""
              }`}
            >
              <Settings className="size-3.5" />
            </button>
          </div>

          {/* SLA Settings Overlay Popover */}
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 z-20 w-64 rounded-lg border bg-popover p-4 shadow-md text-sm text-popover-foreground animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between font-semibold pb-1.5 border-b">
                <span>Configure Inactivity Threshold</span>
              </div>
              <div className="space-y-3 mt-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Show accounts inactive for:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">≥ {slaDays} days</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={slaDays}
                  onChange={(e) => setSlaDays(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  SQL Rule: <code className="bg-muted px-1 py-0.5 rounded text-foreground">Last_Activity_Date &gt; {slaDays} days</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Exposure Value / SLA Stats Card */}
        <div className="mt-4 grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
          <div className="text-left border-r pr-2">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block tracking-wider">Risk Exposure</span>
            <span className="text-lg font-bold text-foreground block mt-0.5">{exposureTotals.valueFormatted}</span>
          </div>
          <div className="text-left pl-2">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block tracking-wider">Avg Inactive Time</span>
            <span className="text-lg font-bold text-foreground block mt-0.5">{exposureTotals.avgDays} days</span>
          </div>
        </div>

        {/* Dormant accounts list */}
        <div className="mt-5 space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse flex flex-col gap-2 p-3 rounded-lg border bg-muted/20">
                  <div className="flex justify-between">
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-4 w-12 bg-muted rounded" />
                  </div>
                  <div className="h-3 w-20 bg-muted rounded mt-1" />
                </div>
              ))}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
              <AlertCircle className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">Clean Workspace</p>
              <p className="text-xs text-muted-foreground mt-0.5">All accounts have recent activities.</p>
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <div
                key={account.id}
                className="group/item flex flex-col gap-2 p-3 rounded-lg border bg-background hover:border-border/80 transition-all shadow-3xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">{account.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Value: <span className="font-semibold text-foreground/80">{account.value}</span></p>
                  </div>
                  
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${getBadgeStyle(account.days)}`}>
                    {getBadgeText(account.days)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t pt-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Inactive: <span className="font-semibold text-foreground/75 tabular-nums">{account.days} days</span>
                  </span>

                  {/* Hover Quick Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAction(account.id, "email", account.name)}
                      title="Send Email"
                      className="p-1 rounded-md text-muted-foreground hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/20 border border-transparent hover:border-sky-100 dark:hover:border-sky-900/10 transition-colors cursor-pointer"
                    >
                      <Mail className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleAction(account.id, "call", account.name)}
                      title="Log Call"
                      className="p-1 rounded-md text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/10 transition-colors cursor-pointer"
                    >
                      <Phone className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleAction(account.id, "dismiss", account.name)}
                      title="Mark Touched"
                      className="p-1 rounded-md text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/10 transition-colors cursor-pointer"
                    >
                      <Check className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="mt-4 border-t pt-3 text-[10px] text-muted-foreground flex items-center gap-1.5 leading-relaxed">
        <span className="font-semibold text-rose-600 dark:text-rose-400 shrink-0">SLA Violation:</span> Action required on all accounts inactive beyond threshold to prevent pipeline leakage.
      </div>
    </div>
  )
}
