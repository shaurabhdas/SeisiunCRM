"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import {
  Handshake,
  TrendingUp,
  X,
  Mail,
  Phone,
  Calendar,
  Play,
  Pencil,
  Plus,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  MoreVertical,
  Trash2,
  HelpCircle,
  Briefcase,
  Link as LinkIcon,
  FileText,
  Clock,
  ArrowUpRight
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"

import {
  calculateDaysSinceContact,
  getFollowUpColorToken,
  formatFollowUpDisplay,
  formatDealValue
} from "@/lib/followup"

import { Deal, DealActivity, DealStageHistory } from "@/lib/deals"

interface Account {
  id: string
  name: string
  industry: string | null
  companySize: string | null
  salesRegion: string | null
  createdAt: string
}

interface Lead {
  id: string
  opportunityName: string
  stage: string
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
        <React.Suspense fallback={
          <div className="flex flex-1 flex-col bg-[#f7f7f2] dark:bg-zinc-950/40 pb-10 px-4 pt-6 lg:px-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DEAL PIPELINE</p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight md:text-3xl text-foreground">Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-4">Loading pipeline...</p>
          </div>
        }>
          <PipelinePageContent />
        </React.Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}

function PipelinePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlDealId = searchParams.get('deal')
  const supabase = createClient()
  const [userProfile, setUserProfile] = React.useState<any>(null)
  const [activeReps, setActiveReps] = React.useState<any[]>([])
  const [reassignmentOpen, setReassignmentOpen] = React.useState(true)
  const [assigningDealId, setAssigningDealId] = React.useState<string | null>(null)

  const [deals, setDeals] = React.useState<Deal[]>([])
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([])
  const [allLeads, setAllLeads] = React.useState<Lead[]>([])
  const [regions] = React.useState<string[]>(['US East', 'US West', 'EMEA', 'APAC'])
  const [loading, setLoading] = React.useState(true)

  // Selected Deal
  const [selectedDealId, setSelectedDealId] = React.useState<string | null>(null)

  // Collapsed state for Closed Won and Closed Lost columns
  const [isWonCollapsed, setIsWonCollapsed] = React.useState(true)
  const [isLostCollapsed, setIsLostCollapsed] = React.useState(true)

  // Modals Visibility
  const [isAddDealOpen, setIsAddDealOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isMarkLostOpen, setIsMarkLostOpen] = React.useState(false)
  const [isConversionOpen, setIsConversionOpen] = React.useState(false)
  
  // Three-dot Action states
  const [showActionsMenu, setShowActionsMenu] = React.useState(false)
  const [isOnHoldOpen, setIsOnHoldOpen] = React.useState(false)
  const [onHoldResumeDate, setOnHoldResumeDate] = React.useState("")
  const [lostReason, setLostReason] = React.useState("lost_to_competitor")

  // Overview edit state
  const [isEditingOverview, setIsEditingOverview] = React.useState(false)
  const [overviewForm, setOverviewForm] = React.useState({
    opportunity_name: "",
    deal_type: "poc" as "poc" | "full_contract",
    reported_value: 0,
    potential_full_contract_value: 0 as number | null,
    value_confidence: "estimated" as "confirmed" | "estimated",
    forecast_close_date: "",
    proposal_date: "",
    close_date: "",
    sow_reference: "",
    sales_region: "",
    competitor: "",
    notes: ""
  })

  // Collapsible Panel sections
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({
    overview: false,
    originatingDeal: false,
    linkedLead: false,
    activityLog: false,
    stageHistory: false
  })

  // Inline forms in detail panel
  const [isLoggingActivity, setIsLoggingActivity] = React.useState(false)
  const [selectedActivityType, setSelectedActivityType] = React.useState<string | null>(null)
  const [newActivityForm, setNewActivityForm] = React.useState({
    activityDate: new Date().toISOString().split('T')[0],
    note: ""
  })

  // Add Deal Form State
  const [newDealForm, setNewDealForm] = React.useState({
    opportunityName: "",
    accountName: "",
    accountId: "",
    leadId: "",
    dealType: "poc" as "poc" | "full_contract",
    reportedValue: "" as string | number,
    potentialFullContractValue: "" as string | number,
    valueConfidence: "estimated" as "confirmed" | "estimated",
    salesRegion: "US East",
    forecastCloseDate: ""
  })

  // Account Typeahead Search State
  const [accountQuery, setAccountQuery] = React.useState("")
  const [filteredAccounts, setFilteredAccounts] = React.useState<Account[]>([])
  const [isAccountConfirmed, setIsAccountConfirmed] = React.useState(false)
  const [confirmedAccountName, setConfirmedAccountName] = React.useState("")

  React.useEffect(() => {
    loadData()
    
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, status')
          .eq('id', user.id)
          .single()
        setUserProfile(profile)
        
        if (profile && (profile.role === 'super_admin' || profile.role === 'manager')) {
          const { data: reps } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .eq('status', 'active')
            .eq('role', 'rep')
          setActiveReps(reps || [])
        }
      }
    }
    fetchProfile()
  }, [])

  const handleAssignDealToRep = async (dealId: string, repId: string, repName: string) => {
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_rep_id: repId,
          assigned_rep_name: repName,
          needs_reassignment: false
        })
      })
      if (res.ok) {
        setAssigningDealId(null)
        loadData()
      } else {
        alert("Failed to assign deal to rep")
      }
    } catch (err) {
      console.error("Error assigning deal to rep:", err)
    }
  }

  // Sync urlDealId to state
  React.useEffect(() => {
    if (deals.length > 0) {
      if (urlDealId) {
        const matched = deals.find(d => d.id === urlDealId)
        if (matched) {
          setSelectedDealId(urlDealId)
        } else {
          setSelectedDealId(null)
        }
      } else {
        setSelectedDealId(null)
      }
    }
  }, [urlDealId, deals])

  // Sync selectedDealId back to URL
  React.useEffect(() => {
    if (loading) return
    const currentDeal = searchParams.get('deal')
    if (selectedDealId) {
      if (currentDeal !== selectedDealId) {
        router.replace(`/deals/pipeline?deal=${selectedDealId}`)
      }
    } else {
      if (currentDeal) {
        router.replace('/deals/pipeline')
      }
    }
  }, [selectedDealId, router, searchParams, loading])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dealsRes, accsRes, leadsRes] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/leads/accounts'),
        fetch('/api/leads')
      ])

      if (dealsRes.ok) setDeals(await dealsRes.json())
      if (accsRes.ok) setAllAccounts(await accsRes.json())
      if (leadsRes.ok) {
        const rawLeads = await leadsRes.json()
        setAllLeads(rawLeads.map((l: any) => ({
          id: l.id,
          opportunityName: l.opportunityName,
          stage: l.stage
        })))
      }
    } catch (err) {
      console.error("Error loading deals pipeline data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Typeahead filter for Accounts
  React.useEffect(() => {
    if (!accountQuery.trim() || isAccountConfirmed) {
      setFilteredAccounts([])
      return
    }
    const matches = allAccounts.filter(acc =>
      acc.name.toLowerCase().includes(accountQuery.toLowerCase())
    )
    setFilteredAccounts(matches)
  }, [accountQuery, allAccounts, isAccountConfirmed])

  const selectedDeal = deals.find(d => d.id === selectedDealId)

  // Populate Edit Overview Form when selectedDeal changes or editing is enabled
  React.useEffect(() => {
    if (selectedDeal) {
      setOverviewForm({
        opportunity_name: selectedDeal.opportunity_name || "",
        deal_type: selectedDeal.deal_type || "poc",
        reported_value: selectedDeal.reported_value || 0,
        potential_full_contract_value: selectedDeal.potential_full_contract_value || 0,
        value_confidence: selectedDeal.value_confidence || "estimated",
        forecast_close_date: selectedDeal.forecast_close_date ? selectedDeal.forecast_close_date.split('T')[0] : "",
        proposal_date: selectedDeal.proposal_date ? selectedDeal.proposal_date.split('T')[0] : "",
        close_date: selectedDeal.close_date ? selectedDeal.close_date.split('T')[0] : "",
        sow_reference: selectedDeal.sow_reference || "",
        sales_region: selectedDeal.sales_region || "",
        competitor: selectedDeal.competitor || "",
        notes: selectedDeal.notes || ""
      })
    }
  }, [selectedDeal, isEditingOverview])

  // Get most recent activity days for a deal
  const getDealInactivityDays = (deal: Deal): number | null => {
    if (!deal.activities || deal.activities.length === 0) return null
    // activities are pre-sorted descending by activity_date
    return calculateDaysSinceContact(deal.activities[0].activity_date)
  }

  // Summary Stat Calculations
  const activeStages = ['proposal_submitted', 'negotiation', 'on_hold']
  const totalPipelineVal = deals
    .filter(d => activeStages.includes(d.stage))
    .reduce((sum, d) => sum + Number(d.reported_value || 0), 0)

  const pocPipelineVal = deals
    .filter(d => d.deal_type === 'poc' && activeStages.includes(d.stage))
    .reduce((sum, d) => sum + Number(d.reported_value || 0), 0)

  const fullPipelineVal = deals
    .filter(d => d.deal_type === 'full_contract' && activeStages.includes(d.stage))
    .reduce((sum, d) => sum + Number(d.reported_value || 0), 0)

  const dealsAtRiskCount = deals.filter(d => {
    if (!['proposal_submitted', 'negotiation'].includes(d.stage)) return false
    const days = getDealInactivityDays(d)
    return days === null || days >= 7
  }).length

  // Columns specification
  const columnsList = [
    { id: 'proposal_submitted', label: 'Proposal Submitted', bg: 'var(--stage-outreach-bg)', text: 'var(--stage-outreach-text)', collapsed: false },
    { id: 'negotiation', label: 'Negotiation', bg: 'var(--stage-evaluating-bg)', text: 'var(--stage-evaluating-text)', collapsed: false },
    { id: 'closed_won', label: 'Closed Won', bg: 'var(--followup-safe)', text: '#ffffff', collapsed: isWonCollapsed, setCollapsed: setIsWonCollapsed },
    { id: 'closed_lost', label: 'Closed Lost', bg: 'var(--color-destructive)', text: '#ffffff', collapsed: isLostCollapsed, setCollapsed: setIsLostCollapsed },
    { id: 'on_hold', label: 'On Hold', bg: 'var(--muted)', text: 'var(--muted-foreground)', collapsed: false }
  ]

  // Add Deal POST
  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const body = {
        opportunity_name: newDealForm.opportunityName,
        deal_type: newDealForm.dealType,
        reported_value: Number(newDealForm.reportedValue || 0),
        potential_full_contract_value: newDealForm.dealType === 'poc' && newDealForm.potentialFullContractValue ? Number(newDealForm.potentialFullContractValue) : null,
        value_confidence: newDealForm.valueConfidence,
        sales_region: newDealForm.salesRegion,
        forecast_close_date: newDealForm.forecastCloseDate || null,
        account_id: newDealForm.accountId || null,
        accountName: newDealForm.accountName || null,
        lead_id: newDealForm.leadId || null
      }

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        const created = await res.json()
        await loadData()
        setIsAddDealOpen(false)
        setSelectedDealId(created.id)
        
        // Reset Form
        setNewDealForm({
          opportunityName: "",
          accountName: "",
          accountId: "",
          leadId: "",
          dealType: "poc",
          reportedValue: "",
          potentialFullContractValue: "",
          valueConfidence: "estimated",
          salesRegion: "US East",
          forecastCloseDate: ""
        })
        setAccountQuery("")
        setIsAccountConfirmed(false)
        setConfirmedAccountName("")
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Delete Deal
  const handleDeleteDeal = async () => {
    if (!selectedDealId) return
    try {
      const res = await fetch(`/api/deals/${selectedDealId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setIsDeleteOpen(false)
        setSelectedDealId(null)
        await loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Stage progression validation
  const getStageProgressionError = (deal: Deal, toStage: string): string | null => {
    const fromStage = deal.stage
    if (fromStage === 'proposal_submitted' && toStage === 'negotiation') {
      if (!deal.proposal_date) {
        return "Log at least one activity after the proposal date to advance to Negotiation."
      }
      const proposalTime = new Date(deal.proposal_date).getTime()
      const hasAct = (deal.activities || []).some(act => {
        return new Date(act.activity_date).getTime() > proposalTime
      })
      if (!hasAct) {
        return "Log at least one activity after the proposal date to advance to Negotiation."
      }
    }
    if (fromStage === 'negotiation' && toStage === 'closed_won') {
      if (!deal.sow_reference || !deal.close_date) {
        return "Enter the SOW reference number and close date before marking as Closed Won."
      }
    }
    return null
  }

  const getNextStage = (stage: string): 'negotiation' | 'closed_won' | null => {
    if (stage === 'proposal_submitted') return 'negotiation'
    if (stage === 'negotiation') return 'closed_won'
    return null
  }

  const handleMoveToNextStage = async () => {
    if (!selectedDeal) return
    const nextStage = getNextStage(selectedDeal.stage)
    if (!nextStage) return

    try {
      const res = await fetch(`/api/deals/${selectedDeal.id}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: nextStage })
      })

      if (res.ok) {
        const { deal: updated, showConversionPrompt } = await res.json()
        await loadData()
        if (showConversionPrompt) {
          setIsConversionOpen(true)
        }
      } else {
        const err = await res.json()
        alert(err.error || "Failed to update stage")
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Mark as Lost
  const handleMarkAsLost = async () => {
    if (!selectedDealId) return
    try {
      const res = await fetch(`/api/deals/${selectedDealId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: 'closed_lost', lost_reason: lostReason })
      })
      if (res.ok) {
        setIsMarkLostOpen(false)
        await loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Put On Hold
  const handlePutOnHold = async () => {
    if (!selectedDealId || !onHoldResumeDate) return
    try {
      const res = await fetch(`/api/deals/${selectedDealId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStage: 'on_hold', on_hold_resume_date: onHoldResumeDate })
      })
      if (res.ok) {
        setIsOnHoldOpen(false)
        setOnHoldResumeDate("")
        await loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // POC Conversion full contract creation
  const handleCreateFullContract = async () => {
    if (!selectedDeal) return
    try {
      const body = {
        opportunity_name: `${selectedDeal.opportunity_name} - Full Contract`,
        deal_type: 'full_contract',
        reported_value: selectedDeal.potential_full_contract_value || 0,
        value_confidence: 'estimated',
        sales_region: selectedDeal.sales_region || 'US East',
        forecast_close_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +90 days
        account_id: selectedDeal.account_id,
        originating_deal_id: selectedDeal.id
      }

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        const newDeal = await res.json()
        await loadData()
        setIsConversionOpen(false)
        setSelectedDealId(newDeal.id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Save Overview Updates
  const handleSaveOverview = async () => {
    if (!selectedDealId) return
    try {
      const res = await fetch(`/api/deals/${selectedDealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity_name: overviewForm.opportunity_name,
          deal_type: overviewForm.deal_type,
          reported_value: Number(overviewForm.reported_value),
          potential_full_contract_value: overviewForm.potential_full_contract_value ? Number(overviewForm.potential_full_contract_value) : null,
          value_confidence: overviewForm.value_confidence,
          forecast_close_date: overviewForm.forecast_close_date || null,
          proposal_date: overviewForm.proposal_date || null,
          close_date: overviewForm.close_date || null,
          sow_reference: overviewForm.sow_reference || null,
          sales_region: overviewForm.sales_region || null,
          competitor: overviewForm.competitor || null,
          notes: overviewForm.notes || null
        })
      })

      if (res.ok) {
        await loadData()
        setIsEditingOverview(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Log Activity POST
  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDealId || !selectedActivityType) return
    try {
      const res = await fetch(`/api/deals/${selectedDealId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: selectedActivityType,
          activity_date: newActivityForm.activityDate,
          note: newActivityForm.note
        })
      })

      if (res.ok) {
        await loadData()
        setIsLoggingActivity(false)
        setSelectedActivityType(null)
        setNewActivityForm({
          activityDate: new Date().toISOString().split('T')[0],
          note: ""
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f7f7f2] dark:bg-zinc-950/40 pb-10">
      
      {/* Zone A: Header & Stat Chips */}
      <div className="flex flex-col gap-4 px-4 pt-6 md:flex-row md:items-center md:justify-between lg:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DEAL PIPELINE</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight md:text-3xl text-foreground">Pipeline</h1>
        </div>
        <button
          onClick={() => setIsAddDealOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <Plus className="size-4" />
          <span>New Deal</span>
        </button>
      </div>

      {/* Summary Stat Chips */}
      <div className="grid grid-cols-1 gap-4 px-4 mt-6 md:grid-cols-4 lg:px-6">
        <Card className="rounded-lg border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Pipeline</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatDealValue(totalPipelineVal)}</p>
        </Card>
        <Card className="rounded-lg border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">POC Pipeline</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatDealValue(pocPipelineVal)}</p>
        </Card>
        <Card className="rounded-lg border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Contract Pipeline</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatDealValue(fullPipelineVal)}</p>
        </Card>
        <Card className="rounded-lg border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deals at Risk</p>
          <p className={`mt-2 text-2xl font-bold ${dealsAtRiskCount > 0 ? "text-[var(--followup-urgent)]" : "text-[var(--followup-safe)]"}`}>
            {dealsAtRiskCount}
          </p>
        </Card>
      </div>

      {/* NEEDS REASSIGNMENT section */}
      {userProfile && (userProfile.role === 'super_admin' || userProfile.role === 'manager') && deals.some(d => d.needs_reassignment) && (
        <div className="mx-4 lg:mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setReassignmentOpen(!reassignmentOpen)}>
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <AlertTriangle className="size-5 text-amber-600 animate-pulse" />
              <span>NEEDS REASSIGNMENT</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800">
                {deals.filter(d => d.needs_reassignment).length}
              </span>
            </div>
            <div className="text-amber-700 hover:text-amber-900 transition-colors">
              {reassignmentOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </div>
          </div>

          {reassignmentOpen && (
            <div className="mt-3 divide-y divide-amber-100 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100/30">
                    <th className="p-3">Opportunity Name</th>
                    <th className="p-3">Account</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Deal Value</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 bg-white/70">
                  {deals
                    .filter(d => d.needs_reassignment)
                    .map(deal => (
                      <tr key={deal.id} className="hover:bg-amber-50/20">
                        <td className="p-3 font-medium text-amber-900">{deal.opportunity_name}</td>
                        <td className="p-3 text-amber-800">{deal.account?.name || "Unassigned"}</td>
                        <td className="p-3">
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            {deal.stage}
                          </span>
                        </td>
                        <td className="p-3 text-amber-900 font-medium">{formatDealValue(deal.reported_value)}</td>
                        <td className="p-3 text-right relative">
                          <div className="inline-block text-left">
                            <button
                              onClick={() => setAssigningDealId(assigningDealId === deal.id ? null : deal.id)}
                              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 px-3 py-1.5 text-xs font-medium transition-colors shadow-sm cursor-pointer"
                            >
                              Assign to Rep
                              <ChevronDown className="size-3" />
                            </button>
                            {assigningDealId === deal.id && (
                              <div className="absolute right-3 mt-1 w-56 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-50 divide-y divide-neutral-100 max-h-60 overflow-y-auto">
                                <div className="py-1">
                                  {activeReps.length === 0 ? (
                                    <div className="px-4 py-2 text-xs text-muted-foreground">No active reps available</div>
                                  ) : (
                                    activeReps.map(rep => (
                                      <button
                                        key={rep.id}
                                        onClick={() => handleAssignDealToRep(deal.id, rep.id, rep.full_name || rep.email)}
                                        className="w-full text-left px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                                      >
                                        {rep.full_name || rep.email}
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Zone B: Kanban Board Grid */}
      <div className="@container/main flex flex-1 flex-col gap-2 mt-6">
        <div className="px-4 lg:px-6">
          <div className={`flex gap-4 transition-all duration-300 ${selectedDealId ? "w-2/3" : "w-full"}`}>
            {columnsList.map(col => {
              const colDeals = deals.filter(d => d.stage === col.id)
              const totalVal = colDeals.reduce((sum, d) => sum + Number(d.reported_value || 0), 0)
              const isCollapsed = col.collapsed

              if (isCollapsed && col.setCollapsed) {
                return (
                  <div key={col.id} className="w-12 shrink-0 flex flex-col bg-muted/30 rounded-xl border border-dashed py-4 items-center">
                    <button
                      onClick={() => col.setCollapsed!(false)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground [writing-mode:vertical-lr] rotate-180 cursor-pointer"
                    >
                      Show {col.label} ({colDeals.length})
                    </button>
                  </div>
                )
              }

              return (
                <div key={col.id} className="flex-1 min-w-[220px] bg-muted/15 rounded-xl border p-3 flex flex-col h-[calc(100vh-280px)] overflow-y-auto">
                  
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b mb-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: col.bg.startsWith("var") ? `var(${col.bg.replace("var(", "").replace(")", "")})` : col.bg }}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">{col.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                        {colDeals.length} deal{colDeals.length !== 1 ? 's' : ''} • {formatDealValue(totalVal)}
                      </span>
                    </div>
                    {col.setCollapsed && (
                      <button
                        onClick={() => col.setCollapsed!(true)}
                        className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Hide
                      </button>
                    )}
                  </div>

                  {/* Deals cards list */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colDeals.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-6 border border-dashed rounded-lg bg-card/25">No deals</p>
                    ) : (
                      colDeals.map(deal => {
                        const isSelected = deal.id === selectedDealId
                        const days = getDealInactivityDays(deal)
                        const followColor = getFollowUpColorToken(days)

                        // Highlight Border Style logic
                        let borderStyle = "border-l-3 border-transparent"
                        if (isSelected) {
                          borderStyle = "border-l-3 border-[var(--stage-connected-bg)]"
                        } else if (days !== null) {
                          if (days >= 10) {
                            borderStyle = "border-l-3 border-[var(--followup-critical)]"
                          } else if (days >= 7) {
                            borderStyle = "border-l-3 border-[var(--followup-urgent)]"
                          }
                        }

                        return (
                          <div
                            key={deal.id}
                            onClick={() => setSelectedDealId(deal.id)}
                            className={`bg-card rounded-lg border p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer relative group ${borderStyle} ${
                              isSelected ? "ring-1 ring-indigo-500/50" : ""
                            }`}
                          >
                            <p className="text-sm font-bold text-foreground leading-snug break-words">{deal.opportunity_name}</p>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{deal.account?.name || "No Account"}</p>
                            
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {/* Deal Type Badge */}
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                deal.deal_type === 'poc'
                                  ? "bg-amber-50 text-amber-800 border border-amber-200/50"
                                  : "bg-teal-50 text-teal-800 border border-teal-200/50"
                              }`}>
                                {deal.deal_type === 'poc' ? 'POC' : 'Full Contract'}
                              </span>

                              {/* Value Confidence Badge */}
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                deal.value_confidence === 'confirmed'
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/50"
                                  : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                              }`}>
                                {deal.value_confidence === 'confirmed' ? 'Confirmed' : 'Estimated'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-muted/50">
                              <span className="text-xs font-bold text-foreground">{formatDealValue(deal.reported_value)}</span>
                              
                              {/* Inactivity Dot */}
                              <div className="flex items-center gap-1">
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: `var(${followColor})` }}
                                />
                                <span className="text-[10px] font-medium text-muted-foreground">{formatFollowUpDisplay(days)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Zone C: Deal Detail Panel (Slides-in split panel) */}
      {selectedDealId && selectedDeal && (
        <div className="fixed top-24 right-4 w-1/3 border-l bg-card p-6 h-[calc(100vh-var(--header-height)-3rem)] overflow-y-auto rounded-r-xl shadow-lg z-30 animate-slide-in">
          
          {/* Header Actions */}
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer relative"
              >
                <MoreVertical className="size-4" />
                {showActionsMenu && (
                  <div className="absolute top-full left-0 mt-1 w-36 bg-card border rounded-lg shadow-md py-1 z-50 text-left">
                    <button
                      onClick={() => { setIsEditingOverview(true); setShowActionsMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted font-medium"
                    >
                      Edit Deal
                    </button>
                    <button
                      onClick={() => { setIsOnHoldOpen(true); setShowActionsMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted font-medium"
                    >
                      Put On Hold
                    </button>
                    <button
                      onClick={() => { setIsDeleteOpen(true); setShowActionsMenu(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 font-semibold"
                    >
                      Delete Deal
                    </button>
                  </div>
                )}
              </button>
            </div>
            
            <button
              onClick={() => setSelectedDealId(null)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Section 1: Deal Header */}
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">{selectedDeal.opportunity_name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{selectedDeal.account?.name || "No Account"}</p>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                selectedDeal.deal_type === 'poc' ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"
              }`}>
                {selectedDeal.deal_type === 'poc' ? 'POC' : 'Full Contract'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                {selectedDeal.value_confidence === 'confirmed' ? 'Confirmed' : 'Estimated'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800">
                {selectedDeal.stage.replace('_', ' ')}
              </span>
            </div>

            {/* Inline On-Hold Resume Date form */}
            {isOnHoldOpen && (
              <div className="mt-4 p-3 bg-muted/40 border rounded-lg animate-fade-in">
                <p className="text-xs font-semibold text-foreground mb-2">Resume Date picker</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={onHoldResumeDate}
                    onChange={(e) => setOnHoldResumeDate(e.target.value)}
                    className="flex-1 bg-card border rounded-md px-2 py-1 text-xs"
                  />
                  <button
                    onClick={handlePutOnHold}
                    disabled={!onHoldResumeDate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-3 py-1 rounded-md disabled:opacity-50"
                  >
                    Hold
                  </button>
                  <button
                    onClick={() => { setIsOnHoldOpen(false); setOnHoldResumeDate(""); }}
                    className="border text-xs px-3 py-1 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-5 pt-4 border-t">
              {/* Move to Next Stage with Gate Condition checks */}
              {(() => {
                const nextStage = getNextStage(selectedDeal.stage)
                const error = getStageProgressionError(selectedDeal, nextStage || '')
                const disabled = !nextStage || !!error

                return (
                  <div className="relative group/btn-tooltip">
                    <button
                      onClick={handleMoveToNextStage}
                      disabled={disabled}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-muted disabled:text-muted-foreground text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>Move to Next Stage</span>
                    </button>
                    {disabled && nextStage && (
                      <span className="absolute top-full mt-2 left-0 hidden group-hover/btn-tooltip:block z-50 w-56 rounded-md bg-zinc-950 p-2.5 text-[10px] leading-relaxed text-white shadow-md font-medium text-left">
                        {error}
                      </span>
                    )}
                  </div>
                )
              })()}

              {selectedDeal.stage !== 'closed_lost' && (
                <button
                  onClick={() => setIsMarkLostOpen(true)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
                >
                  Mark as Lost
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Overview */}
          <div className="border-t py-4">
            <button
              onClick={() => toggleSection('overview')}
              className="flex items-center justify-between w-full font-bold text-sm text-foreground uppercase tracking-wider pb-2 cursor-pointer"
            >
              <span>Overview</span>
              {collapsedSections.overview ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {!collapsedSections.overview && (
              <div className="mt-3">
                {isEditingOverview ? (
                  // Inline edit form
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Opportunity Name</label>
                        <input
                          type="text"
                          value={overviewForm.opportunity_name}
                          onChange={(e) => setOverviewForm({ ...overviewForm, opportunity_name: e.target.value })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Deal Type</label>
                        <select
                          value={overviewForm.deal_type}
                          onChange={(e) => setOverviewForm({ ...overviewForm, deal_type: e.target.value as any })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        >
                          <option value="poc">POC</option>
                          <option value="full_contract">Full Contract</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Reported Value ($)</label>
                        <input
                          type="number"
                          value={overviewForm.reported_value}
                          onChange={(e) => setOverviewForm({ ...overviewForm, reported_value: Number(e.target.value) })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Value Confidence</label>
                        <select
                          value={overviewForm.value_confidence}
                          onChange={(e) => setOverviewForm({ ...overviewForm, value_confidence: e.target.value as any })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        >
                          <option value="estimated">Estimated Scope</option>
                          <option value="confirmed">Confirmed Scope</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Forecast Close Date</label>
                        <input
                          type="date"
                          value={overviewForm.forecast_close_date}
                          onChange={(e) => setOverviewForm({ ...overviewForm, forecast_close_date: e.target.value })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Proposal Date</label>
                        <input
                          type="date"
                          value={overviewForm.proposal_date}
                          onChange={(e) => setOverviewForm({ ...overviewForm, proposal_date: e.target.value })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Close Date</label>
                        <input
                          type="date"
                          value={overviewForm.close_date}
                          onChange={(e) => setOverviewForm({ ...overviewForm, close_date: e.target.value })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">SOW Reference</label>
                        <input
                          type="text"
                          value={overviewForm.sow_reference}
                          onChange={(e) => setOverviewForm({ ...overviewForm, sow_reference: e.target.value })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Sales Region</label>
                        <select
                          value={overviewForm.sales_region}
                          onChange={(e) => setOverviewForm({ ...overviewForm, sales_region: e.target.value })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        >
                          {regions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Competitor</label>
                        <input
                          type="text"
                          value={overviewForm.competitor}
                          onChange={(e) => setOverviewForm({ ...overviewForm, competitor: e.target.value })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        />
                      </div>
                    </div>
                    {overviewForm.deal_type === 'poc' && (
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Potential Full Contract Value ($)</label>
                        <input
                          type="number"
                          value={overviewForm.potential_full_contract_value || 0}
                          onChange={(e) => setOverviewForm({ ...overviewForm, potential_full_contract_value: Number(e.target.value) })}
                          className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Notes</label>
                      <textarea
                        value={overviewForm.notes}
                        onChange={(e) => setOverviewForm({ ...overviewForm, notes: e.target.value })}
                        className="w-full bg-card border rounded px-2.5 py-1.5 text-xs mt-1 h-20 resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveOverview}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-md"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingOverview(false)}
                        className="border text-xs px-3.5 py-1.5 rounded-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Read-only Overview Grid
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Deal Type</p>
                      <p className="mt-1 font-medium text-foreground">{selectedDeal.deal_type === 'poc' ? 'POC' : 'Full Contract'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Stage</p>
                      <p className="mt-1 font-medium text-foreground capitalize">{selectedDeal.stage.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Reported Value</p>
                      <p className="mt-1 font-medium text-foreground">{formatDealValue(selectedDeal.reported_value)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Value Confidence</p>
                      <p className="mt-1 font-medium text-foreground capitalize">{selectedDeal.value_confidence} Scope</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Forecast Close Date</p>
                      <p className="mt-1 font-medium text-foreground">{selectedDeal.forecast_close_date ? new Date(selectedDeal.forecast_close_date).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Proposal Date</p>
                      <p className="mt-1 font-medium text-foreground">{selectedDeal.proposal_date ? new Date(selectedDeal.proposal_date).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Close Date</p>
                      <p className="mt-1 font-medium text-foreground">{selectedDeal.close_date ? new Date(selectedDeal.close_date).toLocaleDateString() : 'Not yet closed'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">SOW Reference</p>
                      <p className="mt-1 font-medium text-foreground">{selectedDeal.sow_reference || 'Not entered'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Sales Region</p>
                      <p className="mt-1 font-medium text-foreground">{selectedDeal.sales_region || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Competitor</p>
                      <p className="mt-1 font-medium text-foreground">{selectedDeal.competitor || 'None'}</p>
                    </div>
                    
                    {/* POC specific fields */}
                    {selectedDeal.deal_type === 'poc' && (
                      <>
                        <div>
                          <p className="font-semibold text-muted-foreground uppercase text-[10px]">Potential Full Contract Value</p>
                          <p className="mt-1 font-medium text-foreground">{formatDealValue(selectedDeal.potential_full_contract_value)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-muted-foreground uppercase text-[10px]">Estimated POC End Date</p>
                          <p className="mt-1 font-medium text-foreground">
                            {selectedDeal.close_date 
                              ? new Date(new Date(selectedDeal.close_date).getTime() + 91 * 24 * 60 * 60 * 1000).toLocaleDateString() 
                              : 'Set close date to calculate.'}
                          </p>
                        </div>
                      </>
                    )}

                    <div className="col-span-2 border-t pt-3">
                      <p className="font-semibold text-muted-foreground uppercase text-[10px]">Notes</p>
                      <p className="mt-1 text-foreground leading-relaxed font-normal whitespace-pre-wrap">{selectedDeal.notes || 'No notes entered.'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Originating Deal */}
          {selectedDeal.originating_deal_id && (
            <div className="border-t py-4">
              <button
                onClick={() => toggleSection('originatingDeal')}
                className="flex items-center justify-between w-full font-bold text-sm text-foreground uppercase tracking-wider pb-2 cursor-pointer"
              >
                <span>Originating Deal</span>
                {collapsedSections.originatingDeal ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
              </button>

              {!collapsedSections.originatingDeal && (
                <div className="mt-3">
                  <div className="p-3 border rounded-lg bg-muted/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">{selectedDeal.originating_deal?.opportunity_name}</p>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">{selectedDeal.originating_deal?.deal_type} POC</span>
                    </div>
                    <button
                      onClick={() => setSelectedDealId(selectedDeal.originating_deal_id!)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <LinkIcon className="size-3" />
                      <span>View Deal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Linked Lead */}
          <div className="border-t py-4">
            <button
              onClick={() => toggleSection('linkedLead')}
              className="flex items-center justify-between w-full font-bold text-sm text-foreground uppercase tracking-wider pb-2 cursor-pointer"
            >
              <span>Linked Lead</span>
              {collapsedSections.linkedLead ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {!collapsedSections.linkedLead && (
              <div className="mt-3">
                {selectedDeal.lead_id ? (
                  <div className="p-3 border rounded-lg bg-muted/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">{selectedDeal.lead?.opportunity_name}</p>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Stage: {selectedDeal.lead?.stage}</span>
                    </div>
                    <Link
                      href={`/leads?lead=${selectedDeal.lead_id}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                    >
                      <LinkIcon className="size-3" />
                      <span>View Lead</span>
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No lead linked to this deal.</p>
                )}
              </div>
            )}
          </div>

          {/* Section 5: Activity Log */}
          <div className="border-t py-4">
            <button
              onClick={() => toggleSection('activityLog')}
              className="flex items-center justify-between w-full font-bold text-sm text-foreground uppercase tracking-wider pb-2 cursor-pointer"
            >
              <span>Activity Log</span>
              {collapsedSections.activityLog ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {!collapsedSections.activityLog && (
              <div className="mt-3">
                {/* Channel Quick buttons */}
                <div className="flex gap-2 mb-4">
                  {['Email', 'Call', 'Meeting', 'Presentation', 'Demo'].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedActivityType(type)
                        setIsLoggingActivity(true)
                      }}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold hover:bg-muted flex items-center gap-1 cursor-pointer ${
                        selectedActivityType === type ? "bg-muted text-foreground border-foreground/50" : "text-muted-foreground"
                      }`}
                    >
                      {type === 'Email' && <Mail className="size-3" />}
                      {type === 'Call' && <Phone className="size-3" />}
                      {type === 'Meeting' && <Calendar className="size-3" />}
                      {type === 'Presentation' && <Play className="size-3" />}
                      {type === 'Demo' && <FileText className="size-3" />}
                      <span>{type}</span>
                    </button>
                  ))}
                </div>

                {/* Inline form */}
                {isLoggingActivity && selectedActivityType && (
                  <form onSubmit={handleLogActivity} className="p-3.5 border rounded-lg bg-muted/10 mb-4 animate-fade-in">
                    <p className="text-xs font-bold text-foreground uppercase mb-3">Log {selectedActivityType}</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Date</label>
                        <input
                          type="date"
                          value={newActivityForm.activityDate}
                          onChange={(e) => setNewActivityForm({ ...newActivityForm, activityDate: e.target.value })}
                          className="w-full bg-card border rounded p-1.5 text-xs mt-1"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Note</label>
                        <textarea
                          placeholder="Log action details..."
                          value={newActivityForm.note}
                          onChange={(e) => setNewActivityForm({ ...newActivityForm, note: e.target.value })}
                          className="w-full bg-card border rounded p-1.5 text-xs mt-1 h-16 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded"
                        >
                          Log
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsLoggingActivity(false); setSelectedActivityType(null); }}
                          className="border text-xs px-3 py-1.5 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Activity list */}
                <div className="space-y-3">
                  {!selectedDeal.activities || selectedDeal.activities.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No activity logged yet.</p>
                  ) : (
                    selectedDeal.activities.map(act => (
                      <div key={act.id} className="p-3 border rounded-lg flex items-start gap-2.5">
                        <div className="p-1 rounded-md bg-muted/65 border">
                          {act.activity_type.toLowerCase() === 'email' && <Mail className="size-3.5 text-sky-600" />}
                          {act.activity_type.toLowerCase() === 'call' && <Phone className="size-3.5 text-emerald-600" />}
                          {act.activity_type.toLowerCase() === 'meeting' && <Calendar className="size-3.5 text-indigo-600" />}
                          {act.activity_type.toLowerCase() === 'presentation' && <Play className="size-3.5 text-amber-600" />}
                          {act.activity_type.toLowerCase() === 'demo' && <FileText className="size-3.5 text-teal-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                            <span className="capitalize">{act.activity_type}</span>
                            <span>{new Date(act.activity_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <p className="text-xs text-foreground mt-1 leading-relaxed whitespace-pre-wrap">{act.note}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Stage History */}
          <div className="border-t py-4">
            <button
              onClick={() => toggleSection('stageHistory')}
              className="flex items-center justify-between w-full font-bold text-sm text-foreground uppercase tracking-wider pb-2 cursor-pointer"
            >
              <span>Stage History</span>
              {collapsedSections.stageHistory ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {!collapsedSections.stageHistory && (
              <div className="mt-3">
                <div className="relative border-l pl-3 space-y-4 ml-1">
                  {!selectedDeal.stage_history || selectedDeal.stage_history.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No transition history.</p>
                  ) : (
                    selectedDeal.stage_history.map(hist => (
                      <div key={hist.id} className="relative text-xs">
                        <span className="absolute -left-[16px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-card" />
                        <span className="block text-[10px] text-muted-foreground font-semibold">
                          {new Date(hist.changed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <p className="mt-0.5 text-foreground">
                          {hist.from_stage 
                            ? `Stage transition from ${hist.from_stage.replace('_', ' ')} to ${hist.to_stage.replace('_', ' ')}`
                            : `Deal created at ${hist.to_stage.replace('_', ' ')}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL 1: Add New Deal */}
      {isAddDealOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
            
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-base font-bold text-foreground uppercase tracking-wider">New Deal Opportunity</h2>
              <button
                onClick={() => setIsAddDealOpen(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleAddDeal} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Opportunity Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp POC"
                  value={newDealForm.opportunityName}
                  onChange={(e) => setNewDealForm({ ...newDealForm, opportunityName: e.target.value })}
                  className="w-full bg-card border rounded px-3 py-2 text-xs mt-1"
                  required
                />
              </div>

              {/* Account Search Typeahead */}
              <div className="relative">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Account Name *</label>
                {isAccountConfirmed ? (
                  <div className="flex items-center justify-between border rounded px-3 py-2 text-xs mt-1 bg-muted/20">
                    <span className="font-semibold text-foreground">{confirmedAccountName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountConfirmed(false)
                        setConfirmedAccountName("")
                        setNewDealForm({ ...newDealForm, accountId: "", accountName: "" })
                      }}
                      className="text-red-600 hover:text-red-700 font-bold text-xs"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Type account name..."
                      value={accountQuery}
                      onChange={(e) => {
                        setAccountQuery(e.target.value)
                        setNewDealForm({ ...newDealForm, accountName: e.target.value })
                      }}
                      className="w-full bg-card border rounded px-3 py-2 text-xs mt-1"
                      required
                    />
                    
                    {filteredAccounts.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-md max-h-40 overflow-y-auto z-50">
                        {filteredAccounts.map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setNewDealForm({
                                ...newDealForm,
                                accountId: acc.id,
                                accountName: acc.name
                              })
                              setConfirmedAccountName(acc.name)
                              setIsAccountConfirmed(true)
                              setAccountQuery("")
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted font-medium"
                          >
                            {acc.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {accountQuery.trim() && !allAccounts.some(a => a.name.toLowerCase() === accountQuery.toLowerCase()) && filteredAccounts.length === 0 && (
                      <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-lg">
                        <p className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold leading-relaxed">
                          Account not found. It will be created automatically.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Linked Lead (Optional) */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Linked Lead</label>
                <select
                  value={newDealForm.leadId}
                  onChange={(e) => setNewDealForm({ ...newDealForm, leadId: e.target.value })}
                  className="w-full bg-card border rounded px-3 py-2 text-xs mt-1"
                >
                  <option value="">No linked lead</option>
                  {allLeads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.opportunityName} ({lead.stage})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Deal Type *</label>
                  <select
                    value={newDealForm.dealType}
                    onChange={(e) => setNewDealForm({ ...newDealForm, dealType: e.target.value as any })}
                    className="w-full bg-[#fcfcfa] dark:bg-zinc-900 border rounded px-3 py-2 text-xs mt-1"
                    required
                  >
                    <option value="poc">POC</option>
                    <option value="full_contract">Full Contract</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Value Confidence *</label>
                  <select
                    value={newDealForm.valueConfidence}
                    onChange={(e) => setNewDealForm({ ...newDealForm, valueConfidence: e.target.value as any })}
                    className="w-full bg-[#fcfcfa] dark:bg-zinc-900 border rounded px-3 py-2 text-xs mt-1"
                    required
                  >
                    <option value="estimated">Estimated Scope</option>
                    <option value="confirmed">Confirmed Scope</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    {newDealForm.dealType === 'poc' ? 'POC Fee (USD) *' : 'Contract Value (USD) *'}
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newDealForm.reportedValue}
                    onChange={(e) => setNewDealForm({ ...newDealForm, reportedValue: e.target.value })}
                    className="w-full bg-card border rounded px-3 py-2 text-xs mt-1"
                    required
                  />
                </div>

                {newDealForm.dealType === 'poc' && (
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Estimated Full Contract Value (USD)</label>
                    <input
                      type="number"
                      placeholder="e.g. 250000"
                      value={newDealForm.potentialFullContractValue}
                      onChange={(e) => setNewDealForm({ ...newDealForm, potentialFullContractValue: e.target.value })}
                      className="w-full bg-card border rounded px-3 py-2 text-xs mt-1"
                    />
                    <p className="text-[9px] text-muted-foreground mt-1">Used for pipeline forecasting. Can be updated as the POC progresses.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Sales Region *</label>
                  <select
                    value={newDealForm.salesRegion}
                    onChange={(e) => setNewDealForm({ ...newDealForm, salesRegion: e.target.value })}
                    className="w-full bg-[#fcfcfa] dark:bg-zinc-900 border rounded px-3 py-2 text-xs mt-1"
                    required
                  >
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Forecast Close Date *</label>
                  <input
                    type="date"
                    value={newDealForm.forecastCloseDate}
                    onChange={(e) => setNewDealForm({ ...newDealForm, forecastCloseDate: e.target.value })}
                    className="w-full bg-card border rounded px-3 py-2 text-xs mt-1"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddDealOpen(false)}
                  className="border text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Create Deal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Mark as Lost reason dropdown */}
      {isMarkLostOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Lost Reason picker</h2>
              <button onClick={() => setIsMarkLostOpen(false)} className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Why was this deal lost? *</label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full bg-card border rounded px-3 py-2 text-xs mt-1"
                >
                  <option value="lost_to_competitor">Lost to Competitor</option>
                  <option value="budget_frozen">Budget Frozen</option>
                  <option value="no_decision">No Decision</option>
                  <option value="scope_too_large">Scope Too Large</option>
                  <option value="timing">Timing</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={() => setIsMarkLostOpen(false)} className="border text-xs px-3.5 py-1.5 rounded-md font-medium cursor-pointer">Cancel</button>
                <button onClick={handleMarkAsLost} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-md cursor-pointer">Mark as Lost</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: POC to Full Contract Conversion prompt */}
      {isConversionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-6 py-5">
              <h2 className="text-base font-extrabold text-foreground tracking-tight">Create Full Contract Opportunity?</h2>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-normal">
                This POC is now closed. Would you like to create a full contract opportunity for this account?
              </p>
              <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t">
                <button
                  onClick={() => setIsConversionOpen(false)}
                  className="border text-xs px-4 py-2 rounded-lg font-semibold hover:bg-muted cursor-pointer"
                >
                  Skip for Now
                </button>
                <button
                  onClick={handleCreateFullContract}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Create Opportunity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-6">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Delete Deal Opportunity</h2>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Are you sure you want to delete this deal? This action is permanent and will cascade delete all logged activities and stage history rows.
              </p>
              <div className="flex justify-end gap-2 mt-5 pt-3 border-t">
                <button onClick={() => setIsDeleteOpen(false)} className="border text-xs px-3.5 py-1.5 rounded-md font-medium cursor-pointer">Cancel</button>
                <button onClick={handleDeleteDeal} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-md cursor-pointer">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
