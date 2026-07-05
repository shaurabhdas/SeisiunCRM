"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { AlertTriangle, Clock } from "lucide-react"

import {
  calculateDaysSinceContact,
  getFollowUpColorToken,
  formatFollowUpDisplay,
  formatDealValue
} from "@/lib/followup"

import { Deal } from "@/lib/deals"

interface Lead {
  id: string
  opportunityName: string
  accountId: string | null
  account: { name: string } | null
  stage: string
  dealValue: number | null
  lastConnectDate: string | null
}

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <AtRiskPageContent />
      </SidebarInset>
    </SidebarProvider>
  )
}

function AtRiskPageContent() {
  const router = useRouter()
  const [deals, setDeals] = React.useState<Deal[]>([])
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dealsRes, leadsRes] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/leads')
      ])
      if (dealsRes.ok) setDeals(await dealsRes.ok ? await dealsRes.json() : [])
      if (leadsRes.ok) setLeads(await leadsRes.ok ? await leadsRes.json() : [])
    } catch (err) {
      console.error("Error loading stalled items:", err)
    } finally {
      setLoading(false)
    }
  }

  // Filter Stalled Deals:
  // stage in proposal_submitted or negotiation AND (last activity > 7 days or no activity exists)
  const stalledDeals = deals.filter(deal => {
    if (!['proposal_submitted', 'negotiation'].includes(deal.stage)) return false
    const lastActDate = deal.activities && deal.activities.length > 0 ? deal.activities[0].activity_date : null
    const days = calculateDaysSinceContact(lastActDate)
    return days === null || days >= 7
  })

  // Filter Stalled Leads:
  // stage is evaluating AND (last_connect_date > 10 days or null)
  const stalledLeads = leads.filter(lead => {
    if (lead.stage?.toLowerCase() !== 'evaluating') return false
    const days = calculateDaysSinceContact(lead.lastConnectDate)
    return days === null || days >= 10
  })

  return (
    <div className="flex flex-1 flex-col bg-[#f7f7f2] dark:bg-zinc-950/40 pb-10">
      
      {/* Header */}
      <div className="px-4 pt-6 lg:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attention Items</p>
        <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight md:text-3xl text-foreground flex items-center gap-2">
          <AlertTriangle className="size-6 text-orange-500" />
          <span>At Risk Pipeline</span>
        </h1>
      </div>

      <div className="px-4 mt-6 lg:px-6 space-y-10">
        
        {/* Section 1: Stalled Deals */}
        <div>
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">STALLED DEALS</h2>
            <span className="text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400 font-semibold px-2 py-0.5 rounded">
              7+ days inactive
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-2xs">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase font-semibold bg-muted/20">
                  <th className="py-3 px-4">Opportunity</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Deal Type</th>
                  <th className="py-3 px-4">Reported Value</th>
                  <th className="py-3 px-4 text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground italic">Loading stalled deals...</td>
                  </tr>
                ) : stalledDeals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground italic">No stalled deals. All active deals have recent activity.</td>
                  </tr>
                ) : (
                  stalledDeals.map(deal => {
                    const lastActDate = deal.activities && deal.activities.length > 0 ? deal.activities[0].activity_date : null
                    const days = calculateDaysSinceContact(lastActDate)
                    const followColor = getFollowUpColorToken(days)

                    return (
                      <tr
                        key={deal.id}
                        onClick={() => router.push(`/deals/pipeline?deal=${deal.id}`)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                          {deal.opportunity_name}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">{deal.account?.name || '—'}</td>
                        <td className="py-3.5 px-4 capitalize text-xs font-semibold text-foreground">{deal.stage.replace('_', ' ')}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            deal.deal_type === 'poc' ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"
                          }`}>
                            {deal.deal_type === 'poc' ? 'POC' : 'Full Contract'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-foreground">{formatDealValue(deal.reported_value)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `var(${followColor})` }} />
                            <span className="font-semibold text-foreground">{formatFollowUpDisplay(days)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-muted/50" />

        {/* Section 2: Stalled Leads */}
        <div>
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">STALLED LEADS</h2>
            <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 font-semibold px-2 py-0.5 rounded">
              Evaluating stage • 10+ days inactive
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card shadow-2xs">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase font-semibold bg-muted/20">
                  <th className="py-3 px-4">Opportunity</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Deal Value</th>
                  <th className="py-3 px-4 text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground italic">Loading stalled leads...</td>
                  </tr>
                ) : stalledLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground italic">No stalled leads in Evaluating stage.</td>
                  </tr>
                ) : (
                  stalledLeads.map(lead => {
                    const days = calculateDaysSinceContact(lead.lastConnectDate)
                    const followColor = getFollowUpColorToken(days)

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => router.push(`/leads?lead=${lead.id}`)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-foreground group-hover:text-indigo-600 transition-colors">
                          {lead.opportunityName}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">{lead.account?.name || '—'}</td>
                        <td className="py-3.5 px-4 capitalize text-xs font-semibold text-foreground">{lead.stage}</td>
                        <td className="py-3.5 px-4 font-bold text-foreground">{formatDealValue(lead.dealValue)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `var(${followColor})` }} />
                            <span className="font-semibold text-foreground">{formatFollowUpDisplay(days)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  )
}
