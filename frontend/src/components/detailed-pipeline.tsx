"use client"

import * as React from "react"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowUp, 
  ArrowDown, 
  AlertTriangle, 
  Settings, 
  HelpCircle,
  TrendingUp,
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer as Dialog,
  DrawerContent as DialogContent,
  DrawerHeader as DialogHeader,
  DrawerTitle as DialogTitle,
  DrawerFooter as DialogFooter,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DealRow {
  id: string
  account: string
  dealName: string
  dealSize: string
  value: number
  stageProbability: string
  stageProbabilityRaw: number
  step: string
  lastAction: string
  riskFlags: string[]
  valueArrow: string
  timelineArrow: string
  activityVelocity: string
  activityCount: number
  overrideRiskFlag: boolean
  customRiskText: string | null
  manualProbability: number | null
  expectedCloseDate: string | null
}

export function DetailedPipeline({ 
  refreshKey, 
  onRefresh 
}: { 
  refreshKey: number
  onRefresh: () => void 
}) {
  const [deals, setDeals] = React.useState<DealRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedDeal, setSelectedDeal] = React.useState<DealRow | null>(null)
  
  // Form State
  const [editValue, setEditValue] = React.useState("")
  const [editStage, setEditStage] = React.useState("")
  const [editNextAction, setEditNextAction] = React.useState("")
  const [overrideProb, setOverrideProb] = React.useState(false)
  const [editProb, setEditProb] = React.useState(50)
  const [overrideRisk, setOverrideRisk] = React.useState(false)
  const [editRiskText, setEditRiskText] = React.useState("")

  React.useEffect(() => {
    setLoading(true)
    fetch('/api/forecast/pulse-pipeline')
      .then(res => {
        if (!res.ok) throw new Error("Network response not ok")
        return res.json()
      })
      .then(data => {
        setDeals(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching pipeline:", err)
        setLoading(false)
      })
  }, [refreshKey])

  const handleRowClick = (deal: DealRow) => {
    setSelectedDeal(deal)
    setEditValue(deal.value.toString())
    setEditStage(deal.step)
    setEditNextAction(deal.lastAction)
    setOverrideProb(deal.manualProbability !== null)
    setEditProb(deal.manualProbability !== null ? deal.manualProbability : deal.stageProbabilityRaw)
    setOverrideRisk(deal.overrideRiskFlag)
    setEditRiskText(deal.customRiskText || "")
  }

  const handleSaveChanges = () => {
    if (!selectedDeal) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const body = {
      value: editValue,
      stage: editStage,
      nextAction: editNextAction,
      manualProbability: overrideProb ? editProb : null,
      overrideRiskFlag: overrideRisk,
      customRiskText: editRiskText
    }

    fetch(`${apiUrl}/deals/${selectedDeal.id}/override`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to save changes")
        return res.json()
      })
      .then(() => {
        setSelectedDeal(null)
        onRefresh() // Trigger parent state refresh
      })
      .catch(err => console.error("Error saving deal override:", err))
  }

  // Render Arrows helper
  const renderTrend = (valueArrow: string, timelineArrow: string) => {
    const valueEl = valueArrow === 'up' ? (
      <ArrowUpRight className="size-4 text-emerald-600 shrink-0" />
    ) : valueArrow === 'down' ? (
      <ArrowDownRight className="size-4 text-rose-600 shrink-0" />
    ) : null

    const timeEl = timelineArrow === 'up' ? (
      <ArrowUp className="size-4 text-emerald-600 shrink-0" />
    ) : timelineArrow === 'down' ? (
      <ArrowDown className="size-4 text-rose-600 shrink-0" />
    ) : null

    if (!valueEl && !timeEl) return null

    return (
      <div className="flex items-center gap-0.5 ml-2">
        {valueEl}
        {timeEl}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-5 shadow-xs flex flex-col justify-between h-full min-h-[380px]">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">DETAILED DEAL PIPELINE</h2>
            <p className="text-sm text-muted-foreground">Calculated probabilities, activity velocity, and risk reviews.</p>
          </div>
          <AlertTriangle className="size-5 text-amber-600" />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs uppercase font-semibold">
                <th className="py-3 px-2">Account</th>
                <th className="py-3 px-2">Deal Size</th>
                <th className="py-3 px-2">Stage Prob.</th>
                <th className="py-3 px-2">Step</th>
                <th className="py-3 px-2">Last Action</th>
                <th className="py-3 px-2 text-right">Risk Flag / Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading pipeline records...
                  </td>
                </tr>
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No active pipeline deals.
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr 
                    key={deal.id} 
                    onClick={() => handleRowClick(deal)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-2 font-medium text-foreground">
                      {deal.account}
                      <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                        {deal.dealName}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 font-semibold text-foreground">{deal.dealSize}</td>
                    <td className="py-3.5 px-2 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className={deal.manualProbability !== null ? "text-indigo-600 dark:text-indigo-400" : ""}>
                          {deal.stageProbability}
                        </span>
                        {deal.manualProbability !== null && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-1 py-0.5 rounded font-normal">
                            manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-muted-foreground">{deal.step}</td>
                    <td className="py-3.5 px-2 max-w-[200px] truncate">
                      <span className="rounded-full bg-sky-50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-400 px-2.5 py-1 text-xs font-medium border border-sky-100 dark:border-sky-900/30">
                        {deal.lastAction}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      <div className="flex items-center justify-end">
                        {/* Risk Indicator with hover tooltip */}
                        {deal.riskFlags.length > 0 ? (
                          <div 
                            className="relative group/tooltip flex items-center justify-center size-5 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30"
                            title={deal.riskFlags.join(", ")}
                          >
                            <AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
                            {/* Custom Tooltip */}
                            <span className="absolute bottom-full mb-2 right-0 hidden group-hover/tooltip:block z-10 w-48 rounded bg-zinc-950 p-2 text-xs text-white shadow-md text-left">
                              {deal.riskFlags[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold">Healthy</span>
                        )}
                        {/* Trend arrows */}
                        {renderTrend(deal.valueArrow, deal.timelineArrow)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Override Dialog */}
      <Dialog open={selectedDeal !== null} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Override Forecast Details</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Modify deal parameters or apply manual confidence adjustments for {selectedDeal?.account}.
            </p>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Deal Value */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right text-sm">Value ($)</Label>
              <Input
                id="value"
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="col-span-3"
              />
            </div>

            {/* Stage/Step */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stage" className="text-right text-sm">Stage</Label>
              <div className="col-span-3">
                <Select value={editStage} onValueChange={(val) => setEditStage(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Qualified">Qualified</SelectItem>
                    <SelectItem value="Discovery">Discovery</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Next Action */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nextAction" className="text-right text-sm">Next Action</Label>
              <Input
                id="nextAction"
                value={editNextAction}
                onChange={(e) => setEditNextAction(e.target.value)}
                className="col-span-3"
              />
            </div>

            <hr className="my-1" />

            {/* Manual Probability Switch & Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Override Stage Probability</Label>
                <input
                  type="checkbox"
                  checked={overrideProb}
                  onChange={(e) => setOverrideProb(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {overrideProb && (
                <div className="space-y-2 pl-2 border-l-2 border-indigo-200">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Probability Weight</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{editProb}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editProb}
                    onChange={(e) => setEditProb(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              )}
            </div>

            <hr className="my-1" />

            {/* Risk Overrides */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Dismiss Automated Risks</Label>
                <input
                  type="checkbox"
                  checked={overrideRisk}
                  onChange={(e) => setOverrideRisk(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {!overrideRisk && (
                <div className="grid gap-2">
                  <Label htmlFor="customRisk" className="text-xs text-muted-foreground">Custom Risk Message (Optional)</Label>
                  <Input
                    id="customRisk"
                    placeholder="Enter manual risk indicator..."
                    value={editRiskText}
                    onChange={(e) => setEditRiskText(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedDeal(null)}>
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium" onClick={handleSaveChanges}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
