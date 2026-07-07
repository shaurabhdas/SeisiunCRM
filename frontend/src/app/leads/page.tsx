"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import {
  UsersRound,
  TrendingUp,
  X,
  Mail,
  Phone,
  Calendar,
  Monitor,
  Play,
  Pencil,
  Plus,
  ArrowUpDown,
  Filter,
  Check,
  ChevronRight,
  ChevronDown,
  Info,
  Clock,
  Briefcase,
  AlertTriangle,
  FolderOpen,
  MoreVertical
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { useSearchParams, useRouter } from "next/navigation"

import {
  calculateDaysSinceContact,
  getFollowUpColorToken,
  formatFollowUpDisplay,
  formatDealValue
} from "@/lib/followup"

interface Account {
  id: string
  name: string
  industry: string | null
  companySize: string | null
  salesRegion: string | null
  createdAt: string
}

interface Contact {
  id: string
  leadId: string | null
  accountId: string | null
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  stakeholderRole: string | null // champion, economic_buyer, decision_maker, technical_validator, blocker
  createdAt: string
}

interface Activity {
  id: string
  leadId: string | null
  activityType: string // email, call, meeting, presentation, demo
  activityDate: string
  note: string | null
  createdAt: string
}

interface StageHistory {
  id: string
  leadId: string | null
  fromStage: string | null
  toStage: string
  changedAt: string
}

interface Lead {
  id: string
  opportunityName: string
  accountId: string | null
  account: Account | null
  stage: string // contact, outreach, connected, presentation, demo, evaluating, disqualified
  openDate: string | null
  forecastCloseDate: string | null
  dealValue: number | null
  painPoints: string | null
  competitor: string | null
  lastConnectDate: string | null
  disqualificationReason: string | null
  postDemoOutcome: string | null
  needsReassignment?: boolean | null
  assignedRepId?: string | null
  assignedRepName?: string | null
  createdAt: string
  contacts: Contact[]
  activities: Activity[]
  stageHistory: StageHistory[]
}

function LeadsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlLeadId = searchParams.get('lead')
  const supabase = createClient()
  const [userProfile, setUserProfile] = React.useState<any>(null)
  const [activeReps, setActiveReps] = React.useState<any[]>([])
  const [reassignmentOpen, setReassignmentOpen] = React.useState(true)
  const [assigningLeadId, setAssigningLeadId] = React.useState<string | null>(null)

  const [leads, setLeads] = React.useState<Lead[]>([])
  const [regions, setRegions] = React.useState<string[]>([])
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filters
  const [selectedStage, setSelectedStage] = React.useState<string>("All Stages")
  const [selectedRegion, setSelectedRegion] = React.useState<string>("All Regions")
  const [showDisqualified, setShowDisqualified] = React.useState(false)

  // Sorting
  const [sortColumn, setSortColumn] = React.useState<string>("followup")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  // Selected Lead (Zone C)
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null)

  // Modals / Forms visibility
  const [isAddLeadOpen, setIsAddLeadOpen] = React.useState(false)
  const [isDisqualifyOpen, setIsDisqualifyOpen] = React.useState(false)
  const [disqualifyReason, setDisqualifyReason] = React.useState("no_budget")

  // Edit / Delete / Dropdown State
  const [showMoreMenu, setShowMoreMenu] = React.useState(false)
  const [isEditingLead, setIsEditingLead] = React.useState(false)
  const [editForm, setEditForm] = React.useState({
    opportunityName: "",
    forecastCloseDate: "",
    salesRegion: "US East",
    industry: "",
    companySize: "",
    competitor: "",
    painPoints: "",
    dealValue: 0 as string | number
  })
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Account Confirmation State (Fix 1)
  const [isAccountConfirmed, setIsAccountConfirmed] = React.useState(false)
  const [confirmedAccountName, setConfirmedAccountName] = React.useState("")
  const [accountValidationError, setAccountValidationError] = React.useState<string | null>(null)

  // Inline forms in Zone C
  const [isAddingContact, setIsAddingContact] = React.useState(false)
  const [isLoggingActivity, setIsLoggingActivity] = React.useState(false)
  const [selectedActivityType, setSelectedActivityType] = React.useState<string | null>(null)

  // Form states
  const [newLeadForm, setNewLeadForm] = React.useState({
    opportunityName: "",
    accountName: "",
    accountId: "",
    salesRegion: "US East",
    forecastCloseDate: "",
    painPoints: "",
    dealValue: "" as string | number
  })
  
  const [newContactForm, setNewContactForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    stakeholderRole: "champion"
  })

  const [newActivityForm, setNewActivityForm] = React.useState({
    activityDate: new Date().toISOString().split('T')[0],
    note: ""
  })

  // Account Typeahead Search State
  const [accountQuery, setAccountQuery] = React.useState("")
  const [filteredAccounts, setFilteredAccounts] = React.useState<Account[]>([])

  // Inline editing in Zone C Overview
  const [editingField, setEditingField] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState("")

  // Evaluating Outcome Modal/Dropdown state
  const [showOutcomeDropdown, setShowOutcomeDropdown] = React.useState(false)
  const [postDemoOutcome, setPostDemoOutcome] = React.useState("proposal_requested")

  React.useEffect(() => {
    fetchLeads()
    fetchRegions()
    fetchAccounts()
    
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

  const handleAssignLeadToRep = async (leadId: string, repId: string, repName: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedRepId: repId,
          assignedRepName: repName,
          needsReassignment: false
        })
      })
      if (res.ok) {
        setAssigningLeadId(null)
        await fetchLeads()
      } else {
        alert("Failed to assign lead to rep")
      }
    } catch (err) {
      console.error("Error assigning lead to rep:", err)
    }
  }

  // 1. Sync urlLeadId changes to selectedLeadId state
  React.useEffect(() => {
    if (leads.length > 0) {
      if (urlLeadId) {
        const matched = leads.find(l => l.id === urlLeadId)
        if (matched) {
          setSelectedLeadId(urlLeadId)
        } else {
          setSelectedLeadId(null)
        }
      } else {
        setSelectedLeadId(null)
      }
    }
  }, [urlLeadId, leads])

  // 2. Sync selectedLeadId state changes back to URL
  React.useEffect(() => {
    if (loading) return
    const currentLead = searchParams.get('lead')
    if (selectedLeadId) {
      if (currentLead !== selectedLeadId) {
        router.replace(`/leads?lead=${selectedLeadId}`)
      }
    } else {
      if (currentLead) {
        router.replace('/leads')
      }
    }
  }, [selectedLeadId, router, searchParams, loading])

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads')
      if (!res.ok) throw new Error("Failed to fetch leads")
      const data = await res.json()
      setLeads(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRegions = async () => {
    try {
      const res = await fetch('/api/leads/regions')
      if (res.ok) {
        const data = await res.json()
        setRegions(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/leads/accounts')
      if (res.ok) {
        const data = await res.json()
        setAllAccounts(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Typeahead filter
  React.useEffect(() => {
    if (!accountQuery.trim()) {
      setFilteredAccounts([])
      return
    }
    const matches = allAccounts.filter(acc => 
      acc.name.toLowerCase().includes(accountQuery.toLowerCase())
    )
    setFilteredAccounts(matches)
  }, [accountQuery, allAccounts])

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLeadForm.opportunityName) return

    if (!isAccountConfirmed) {
      setAccountValidationError("Please confirm or clear the account name before saving.")
      return
    }

    try {
      const res = await fetch('/api/leads', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityName: newLeadForm.opportunityName,
          accountName: confirmedAccountName,
          accountId: newLeadForm.accountId || null,
          salesRegion: newLeadForm.salesRegion,
          forecastCloseDate: newLeadForm.forecastCloseDate,
          painPoints: newLeadForm.painPoints,
          dealValue: newLeadForm.dealValue !== "" && newLeadForm.dealValue !== null ? Number(newLeadForm.dealValue) : 0
        })
      })

      if (res.ok) {
        const createdLead = await res.json()
        await fetchLeads()
        await fetchAccounts()
        await fetchRegions()
        
        // Reset form
        setNewLeadForm({
          opportunityName: "",
          accountName: "",
          accountId: "",
          salesRegion: "US East",
          forecastCloseDate: "",
          painPoints: "",
          dealValue: ""
        })
        setAccountQuery("")
        setIsAccountConfirmed(false)
        setConfirmedAccountName("")
        setAccountValidationError(null)
        setIsAddLeadOpen(false)
        
        // Open Zone C for new lead
        setSelectedLeadId(createdLead.id)
      }
    } catch (err) {
      console.error("Error creating lead:", err)
    }
  }

  const handleConfirmNewAccount = () => {
    if (!accountQuery.trim()) return
    setIsAccountConfirmed(true)
    setConfirmedAccountName(accountQuery)
    setNewLeadForm(prev => ({ ...prev, accountName: accountQuery, accountId: "" }))
    setAccountValidationError(null)
  }

  const handleClearAccount = () => {
    setAccountQuery("")
    setConfirmedAccountName("")
    setIsAccountConfirmed(false)
    setNewLeadForm(prev => ({ ...prev, accountName: "", accountId: "" }))
    setAccountValidationError(null)
  }

  const handleSaveLeadChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId) return

    try {
      const res = await fetch(`/api/leads/${selectedLeadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityName: editForm.opportunityName,
          forecastCloseDate: editForm.forecastCloseDate,
          salesRegion: editForm.salesRegion,
          industry: editForm.industry,
          companySize: editForm.companySize,
          competitor: editForm.competitor,
          painPoints: editForm.painPoints,
          dealValue: editForm.dealValue !== "" && editForm.dealValue !== null ? Number(editForm.dealValue) : 0
        })
      })

      if (res.ok) {
        await fetchLeads()
        setIsEditingLead(false)
      } else {
        alert("Failed to save changes")
      }
    } catch (err) {
      console.error("Error saving lead changes:", err)
    }
  }

  const handleDeleteLead = async () => {
    if (!selectedLeadId) return
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/leads/${selectedLeadId}`, {
        method: "DELETE"
      })

      if (res.ok) {
        await fetchLeads()
        setIsDeleteModalOpen(false)
        setSelectedLeadId(null) // Close Zone C
      } else {
        const errData = await res.json()
        setDeleteError(errData.error || "Something went wrong. The lead was not deleted. Please try again.")
      }
    } catch (err) {
      console.error("Error deleting lead:", err)
      setDeleteError("Something went wrong. The lead was not deleted. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId || !newContactForm.firstName || !newContactForm.lastName) return

    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContactForm)
      })

      if (res.ok) {
        await fetchLeads()
        setNewContactForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          stakeholderRole: "champion"
        })
        setIsAddingContact(false)
      }
    } catch (err) {
      console.error("Error adding contact:", err)
    }
  }

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId || !selectedActivityType) return

    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: selectedActivityType,
          activityDate: newActivityForm.activityDate,
          note: newActivityForm.note
        })
      })

      if (res.ok) {
        await fetchLeads()
        setNewActivityForm({
          activityDate: new Date().toISOString().split('T')[0],
          note: ""
        })
        setSelectedActivityType(null)
        setIsLoggingActivity(false)
      }
    } catch (err) {
      console.error("Error logging activity:", err)
    }
  }

  const handleInlineEdit = async (field: string) => {
    if (!selectedLeadId) return
    try {
      const body: any = {}
      if (['opportunityName', 'competitor', 'painPoints', 'forecastCloseDate'].includes(field)) {
        body[field] = editValue
      } else {
        body[field] = editValue
      }

      const res = await fetch(`/api/leads/${selectedLeadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        await fetchLeads()
        setEditingField(null)
      }
    } catch (err) {
      console.error("Error updating lead details:", err)
    }
  }

  const handleDisqualify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId) return

    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/disqualify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disqualifyReason })
      })

      if (res.ok) {
        await fetchLeads()
        setIsDisqualifyOpen(false)
        setSelectedLeadId(null) // Close Zone C
      }
    } catch (err) {
      console.error("Error disqualifying lead:", err)
    }
  }

  const handleStageTransition = async (toStage: string, outcome?: string) => {
    if (!selectedLeadId) return
    try {
      const res = await fetch(`/api/leads/${selectedLeadId}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStage, postDemoOutcome: outcome })
      })

      if (res.ok) {
        await fetchLeads()
        setShowOutcomeDropdown(false)
        if (toStage === 'deal') {
          setSelectedLeadId(null) // Close Zone C on deal completion
        }
      } else {
        const errData = await res.json()
        alert(errData.error || "Failed to update stage")
      }
    } catch (err) {
      console.error("Error updating stage:", err)
    }
  }

  const selectedLead = leads.find(l => l.id === selectedLeadId)

  // Calculations for Stat Chips
  const activeLeads = leads.filter(l => l.stage !== 'disqualified')
  const activeLeadsCount = activeLeads.length

  const dueForFollowUpCount = activeLeads.filter(l => {
    if (!l.lastConnectDate) return true
    const diffTime = Math.abs(new Date().getTime() - new Date(l.lastConnectDate).getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 3
  }).length

  const demoStageOrBeyondCount = activeLeads.filter(l => 
    ['demo', 'evaluating', 'deal'].includes(l.stage)
  ).length

  // Avg Days in Stage calculation
  const getAvgDaysInStage = () => {
    const leadsWithHistory = activeLeads.filter(l => l.stageHistory && l.stageHistory.length > 0)
    if (leadsWithHistory.length === 0) return 0

    let totalDays = 0
    leadsWithHistory.forEach(lead => {
      // Find the latest history record for the current stage
      const currentStageHistory = lead.stageHistory.find(h => h.toStage === lead.stage)
      const dateToCheck = currentStageHistory ? currentStageHistory.changedAt : lead.createdAt
      const diffTime = Math.abs(new Date().getTime() - new Date(dateToCheck).getTime())
      totalDays += Math.floor(diffTime / (1000 * 60 * 60 * 24))
    })

    return Math.round(totalDays / leadsWithHistory.length)
  }

  const avgDaysInStage = getAvgDaysInStage()

  // Filter & Sort Logic
  const filteredLeads = leads.filter(lead => {
    // Show Disqualified Filter
    if (!showDisqualified && lead.stage === 'disqualified') return false
    
    // Stage Filter
    if (selectedStage !== "All Stages") {
      if (lead.stage !== selectedStage.toLowerCase()) return false
    }

    // Region Filter
    if (selectedRegion !== "All Regions") {
      if (!lead.account || lead.account.salesRegion !== selectedRegion) return false
    }

    return true
  }).sort((a, b) => {
    let aVal: any = ""
    let bVal: any = ""

    if (sortColumn === "opportunity") {
      aVal = a.opportunityName.toLowerCase()
      bVal = b.opportunityName.toLowerCase()
    } else if (sortColumn === "contact") {
      aVal = (a.contacts[0] ? `${a.contacts[0].firstName} ${a.contacts[0].lastName}` : "").toLowerCase()
      bVal = (b.contacts[0] ? `${b.contacts[0].firstName} ${b.contacts[0].lastName}` : "").toLowerCase()
    } else if (sortColumn === "stage") {
      aVal = a.stage.toLowerCase()
      bVal = b.stage.toLowerCase()
    } else if (sortColumn === "followup") {
      // Sort logic: Null (No contact) represents highest wait, so it goes to bottom or top
      // Default asc sort: most overdue (largest days since last contact) at the top.
      const getDays = (l: Lead) => {
        if (!l.lastConnectDate) return 9999
        const diff = new Date().getTime() - new Date(l.lastConnectDate).getTime()
        return Math.floor(diff / (1000 * 60 * 60 * 24))
      }
      // Since default sort is Follow-up ascending, and we want most overdue at top,
      // we actually sort by days descending
      aVal = getDays(a)
      bVal = getDays(b)
      // Toggle values so asc means most overdue (largest days) at top
      return sortDirection === "asc" ? bVal - aVal : aVal - bVal
    } else if (sortColumn === "closeDate") {
      aVal = a.forecastCloseDate ? new Date(a.forecastCloseDate).getTime() : 9999999999999
      bVal = b.forecastCloseDate ? new Date(b.forecastCloseDate).getTime() : 9999999999999
    } else if (sortColumn === "region") {
      aVal = (a.account?.salesRegion || "").toLowerCase()
      bVal = (b.account?.salesRegion || "").toLowerCase()
    } else if (sortColumn === "competitor") {
      aVal = (a.competitor || "").toLowerCase()
      bVal = (b.competitor || "").toLowerCase()
    }

    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Follow-up dot indicator calculations
  const getFollowUpInfo = (lead: Lead) => {
    const days = calculateDaysSinceContact(lead.lastConnectDate)
    const token = getFollowUpColorToken(days)
    const text = formatFollowUpDisplay(days)

    let colorClass = "bg-(--followup-safe)"
    if (token === "--followup-critical") colorClass = "bg-(--followup-critical)"
    else if (token === "--followup-urgent") colorClass = "bg-(--followup-urgent)"
    else if (token === "--followup-warning") colorClass = "bg-(--followup-warning)"

    let textClass = "text-foreground font-normal"
    if (days === null) {
      textClass = "font-bold text-(--followup-critical)"
    } else if (days >= 7) {
      textClass = "font-bold text-foreground"
    }

    return {
      text,
      colorClass,
      textClass,
      days: days === null ? 999 : days
    }
  }

  // Stage Progression Validation helper
  const getStageProgressionError = (lead: Lead) => {
    if (lead.stage === 'contact') {
      const hasEmail = lead.activities.some(a => a.activityType === 'email')
      if (!hasEmail) return 'Requires at least one logged "Email" activity.'
    }
    if (lead.stage === 'outreach') {
      const hasCallOrMeeting = lead.activities.some(a => ['call', 'meeting'].includes(a.activityType))
      if (!hasCallOrMeeting) return 'Requires at least one logged "Call" or "Meeting" activity.'
    }
    if (lead.stage === 'connected') {
      if (lead.contacts.length === 0) return 'Requires at least one stakeholder contact.'
    }
    if (lead.stage === 'presentation') {
      const hasPresentation = lead.activities.some(a => a.activityType === 'presentation')
      if (!hasPresentation) return 'Requires at least one logged "Presentation" activity.'
    }
    if (lead.stage === 'demo') {
      const hasDemo = lead.activities.some(a => a.activityType === 'demo')
      if (!hasDemo) return 'Requires at least one logged "Demo" activity.'
      if (!lead.forecastCloseDate) return 'Forecast Close Date must be configured in Overview.'
      const hasBuyerOrDecision = lead.contacts.some(c => ['economic_buyer', 'decision_maker'].includes(c.stakeholderRole || ''))
      if (!hasBuyerOrDecision) return 'Requires at least one contact with role "Economic Buyer" or "Decision Maker".'
    }
    if (lead.stage === 'evaluating') {
      return 'Requires post-demo outcome selection.'
    }
    if (lead.stage === 'disqualified') {
      return 'Disqualified leads cannot progress.'
    }
    if (lead.stage === 'deal') {
      return 'Already advanced to closed won Deal.'
    }
    return null
  }

  const getNextStageLabel = (stage: string) => {
    const sequence = ['contact', 'outreach', 'connected', 'presentation', 'demo', 'evaluating', 'deal']
    const idx = sequence.indexOf(stage)
    if (idx !== -1 && idx < sequence.length - 1) {
      return sequence[idx + 1]
    }
    return ""
  }

  const getStageBadgeClasses = (stage: string) => {
    const s = stage.toLowerCase()
    return `inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider
      ${s === 'contact' ? 'bg-(--stage-contact-bg) text-(--stage-contact-text)' : ''}
      ${s === 'outreach' ? 'bg-(--stage-outreach-bg) text-(--stage-outreach-text)' : ''}
      ${s === 'connected' ? 'bg-(--stage-connected-bg) text-(--stage-connected-text)' : ''}
      ${s === 'presentation' ? 'bg-(--stage-presentation-bg) text-(--stage-presentation-text)' : ''}
      ${s === 'demo' ? 'bg-(--stage-demo-bg) text-(--stage-demo-text)' : ''}
      ${s === 'evaluating' ? 'bg-(--stage-evaluating-bg) text-(--stage-evaluating-text)' : ''}
      ${s === 'disqualified' ? 'bg-(--stage-disqualified-bg) text-(--stage-disqualified-text)' : ''}
      ${s === 'deal' ? 'bg-emerald-500 text-white' : ''}
    `
  }

  const getRoleBadgeClasses = (role: string) => {
    const r = role.toLowerCase()
    return `inline-flex items-center rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-white
      ${r === 'champion' ? 'bg-(--role-champion)' : ''}
      ${r === 'economic_buyer' ? 'bg-(--role-economic-buyer)' : ''}
      ${r === 'decision_maker' ? 'bg-(--role-decision-maker)' : ''}
      ${r === 'technical_validator' ? 'bg-(--role-technical-validator)' : ''}
      ${r === 'blocker' ? 'bg-(--role-blocker)' : ''}
    `
  }

  const getRoleLabel = (role: string) => {
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

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
        
        <div className="flex flex-1 flex-col bg-[#f7f7f2] dark:bg-zinc-950/40 pb-10 min-h-0">
          
          {/* ZONE A: Header & Filters */}
          <div className="flex flex-col gap-4 px-4 pt-6 md:flex-row md:items-center md:justify-between lg:px-6">
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">Sales Pipeline</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">Leads</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Your active opportunities and follow-up queue</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 shadow-2xs">
                <Filter className="size-3.5 text-muted-foreground" />
                <select 
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer text-foreground"
                >
                  <option value="All Stages">All Stages</option>
                  <option value="Contact">Contact</option>
                  <option value="Outreach">Outreach</option>
                  <option value="Connected">Connected</option>
                  <option value="Presentation">Presentation</option>
                  <option value="Demo">Demo</option>
                  <option value="Evaluating">Evaluating</option>
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 shadow-2xs">
                <Filter className="size-3.5 text-muted-foreground" />
                <select 
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer text-foreground"
                >
                  <option value="All Regions">All Regions</option>
                  {regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => setIsAddLeadOpen(true)}
                className="flex items-center gap-1.5 rounded-md bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) transition-colors hover:bg-neutral-800 shadow-sm"
              >
                <Plus className="size-4" />
                Add Lead
              </button>
            </div>
          </div>

          {/* ZONE A Checklist Cards */}
          <div className="grid grid-cols-1 gap-4 px-4 py-6 md:grid-cols-4 lg:px-6">
            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Active Leads</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{activeLeadsCount}</p>
              <p className="mt-1 text-2xs text-muted-foreground">Across pipeline stages</p>
            </Card>

            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Due for Follow-up</p>
              <p className={`mt-2 text-3xl font-bold tracking-tight ${dueForFollowUpCount > 0 ? 'text-(--followup-warning)' : 'text-(--followup-safe)'}`}>
                {dueForFollowUpCount}
              </p>
              <p className="mt-1 text-2xs text-muted-foreground">&gt; 3 days since contact</p>
            </Card>

            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Demo Stage or Beyond</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{demoStageOrBeyondCount}</p>
              <p className="mt-1 text-2xs text-muted-foreground">Demo & Evaluating phases</p>
            </Card>

            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Days in Stage</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{avgDaysInStage}d</p>
              <p className="mt-1 text-2xs text-muted-foreground">Velocity tracking index</p>
            </Card>
          </div>

          {/* NEEDS REASSIGNMENT section */}
          {userProfile && (userProfile.role === 'super_admin' || userProfile.role === 'manager') && leads.some(l => l.needsReassignment) && (
            <div className="mx-4 lg:mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setReassignmentOpen(!reassignmentOpen)}>
                <div className="flex items-center gap-2 text-amber-800 font-semibold">
                  <AlertTriangle className="size-5 text-amber-600 animate-pulse" />
                  <span>NEEDS REASSIGNMENT</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800">
                    {leads.filter(l => l.needsReassignment).length}
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
                      {leads
                        .filter(l => l.needsReassignment)
                        .map(lead => (
                          <tr key={lead.id} className="hover:bg-amber-50/20">
                            <td className="p-3 font-medium text-amber-900">{lead.opportunityName}</td>
                            <td className="p-3 text-amber-800">{lead.account?.name || "Unassigned"}</td>
                            <td className="p-3">
                              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                                {lead.stage}
                              </span>
                            </td>
                            <td className="p-3 text-amber-900 font-medium">{formatDealValue(lead.dealValue)}</td>
                            <td className="p-3 text-right relative">
                              <div className="inline-block text-left">
                                <button
                                  onClick={() => setAssigningLeadId(assigningLeadId === lead.id ? null : lead.id)}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 text-white hover:bg-amber-700 px-3 py-1.5 text-xs font-medium transition-colors shadow-sm cursor-pointer"
                                >
                                  Assign to Rep
                                  <ChevronDown className="size-3" />
                                </button>
                                {assigningLeadId === lead.id && (
                                  <div className="absolute right-3 mt-1 w-56 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-50 divide-y divide-neutral-100 max-h-60 overflow-y-auto">
                                    <div className="py-1">
                                      {activeReps.length === 0 ? (
                                        <div className="px-4 py-2 text-xs text-muted-foreground">No active reps available</div>
                                      ) : (
                                        activeReps.map(rep => (
                                          <button
                                            key={rep.id}
                                            onClick={() => handleAssignLeadToRep(lead.id, rep.id, rep.full_name || rep.email)}
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

          {/* MAIN ZONE B / C Wrapper */}
          <div className="flex flex-1 gap-5 px-4 lg:px-6 overflow-hidden min-h-0">
            
            {/* ZONE B: Leads Table */}
            <div className={`flex flex-col gap-3 transition-all duration-300 ${selectedLeadId ? 'w-2/3' : 'w-full'}`}>
              
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Showing {filteredLeads.length} leads</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground cursor-pointer select-none" htmlFor="showDisqualifiedToggle">
                    Show Disqualified
                  </label>
                  <input 
                    type="checkbox"
                    id="showDisqualifiedToggle"
                    checked={showDisqualified}
                    onChange={(e) => setShowDisqualified(e.target.checked)}
                    className="size-3.5 rounded border-muted text-(--primary) focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto rounded-lg border bg-card shadow-2xs">
                {loading ? (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    Loading leads database...
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center p-6">
                    <FolderOpen className="size-10 text-muted-foreground/60 mb-3" />
                    <p className="font-semibold text-foreground">No leads match your filters</p>
                    <button 
                      onClick={() => {
                        setSelectedStage("All Stages")
                        setSelectedRegion("All Regions")
                      }}
                      className="mt-2 text-xs font-medium text-(--primary) hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th onClick={() => toggleSort("opportunity")} className="p-3 cursor-pointer select-none hover:bg-muted/50">
                          <span className="flex items-center gap-1">
                            Opportunity {sortColumn === "opportunity" && <ArrowUpDown className="size-3" />}
                          </span>
                        </th>
                        <th onClick={() => toggleSort("contact")} className="p-3 cursor-pointer select-none hover:bg-muted/50">
                          <span className="flex items-center gap-1">
                            Contact {sortColumn === "contact" && <ArrowUpDown className="size-3" />}
                          </span>
                        </th>
                        <th onClick={() => toggleSort("stage")} className="p-3 cursor-pointer select-none hover:bg-muted/50">
                          <span className="flex items-center gap-1">
                            Stage {sortColumn === "stage" && <ArrowUpDown className="size-3" />}
                          </span>
                        </th>
                        <th onClick={() => toggleSort("followup")} className="p-3 cursor-pointer select-none hover:bg-muted/50">
                          <span className="flex items-center gap-1">
                            Follow-up {sortColumn === "followup" && <ArrowUpDown className="size-3" />}
                          </span>
                        </th>
                        <th onClick={() => toggleSort("closeDate")} className="p-3 cursor-pointer select-none hover:bg-muted/50">
                          <span className="flex items-center gap-1">
                            Close Date {sortColumn === "closeDate" && <ArrowUpDown className="size-3" />}
                          </span>
                        </th>
                        <th onClick={() => toggleSort("region")} className="p-3 cursor-pointer select-none hover:bg-muted/50">
                          <span className="flex items-center gap-1">
                            Region {sortColumn === "region" && <ArrowUpDown className="size-3" />}
                          </span>
                        </th>
                        <th onClick={() => toggleSort("competitor")} className="p-3 cursor-pointer select-none hover:bg-muted/50">
                          <span className="flex items-center gap-1">
                            Competitor {sortColumn === "competitor" && <ArrowUpDown className="size-3" />}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredLeads.map(lead => {
                        const isSelected = lead.id === selectedLeadId
                        const followUp = getFollowUpInfo(lead)
                        const primaryContact = lead.contacts[0]
                        const additionalContacts = lead.contacts.length - 1

                        // Left border highlights
                        let borderStyle = {}
                        if (isSelected) {
                          borderStyle = { borderLeft: "3px solid var(--stage-connected-bg)" }
                        } else if (lead.stage !== 'disqualified') {
                          if (followUp.days >= 10) {
                            borderStyle = { borderLeft: "3px solid var(--followup-critical)" }
                          } else if (followUp.days >= 7) {
                            borderStyle = { borderLeft: "3px solid var(--followup-urgent)" }
                          }
                        }

                        return (
                          <tr 
                            key={lead.id}
                            style={borderStyle}
                            onClick={() => setSelectedLeadId(lead.id)}
                            className={`cursor-pointer transition-colors hover:bg-(--secondary)
                              ${isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/5' : 'bg-card'}
                              ${lead.stage === 'disqualified' ? 'opacity-50 italic text-muted-foreground' : ''}
                            `}
                          >
                            <td className="p-3">
                              <p className="font-semibold text-foreground text-xs leading-none">{lead.opportunityName}</p>
                              <p className="text-2xs text-muted-foreground mt-1">{lead.account?.name || 'No account linked'}</p>
                            </td>
                            <td className="p-3 text-xs">
                              <div>
                                {primaryContact ? (
                                  <div className="flex items-center gap-1.5">
                                    <span>{primaryContact.firstName} {primaryContact.lastName}</span>
                                    {additionalContacts > 0 && (
                                      <span className="rounded bg-neutral-200 px-1 py-0.5 text-3xs font-semibold text-neutral-600">
                                        +{additionalContacts}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-(--muted-foreground) text-xs font-normal">No contacts</span>
                                )}
                                {lead.assignedRepName && (
                                  <p className="text-3xs text-muted-foreground mt-0.5 font-normal">
                                    Rep: {lead.assignedRepName}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={getStageBadgeClasses(lead.stage)}>
                                {lead.stage}
                              </span>
                            </td>
                            <td className="p-3 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className={`size-2 rounded-full ${followUp.colorClass}`} />
                                <span className={followUp.textClass}>
                                  {followUp.text}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-xs">
                              {lead.forecastCloseDate ? (
                                new Date(lead.forecastCloseDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  timeZone: 'UTC'
                                })
                              ) : (
                                <span className="text-muted-foreground/60">-</span>
                              )}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {lead.account?.salesRegion || "-"}
                            </td>
                            <td className="p-3 text-xs">
                              {lead.competitor ? (
                                <span className="text-foreground">{lead.competitor}</span>
                              ) : (
                                <span className="text-muted-foreground/60">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ZONE C: Lead Detail Panel */}
            {selectedLeadId && selectedLead && (
              <div className="w-1/3 border bg-card rounded-lg shadow-md flex flex-col overflow-hidden min-h-0 animate-in slide-in-from-right duration-200">
                
                {/* Section 1: Lead Header */}
                <div className="border-b p-4 flex justify-between items-start bg-muted/10 relative">
                  <div className="flex-1 min-w-0 pr-2">
                    {isEditingLead ? (
                      <div>
                        <label className="text-3xs uppercase font-bold text-muted-foreground">Opportunity Name *</label>
                        <input 
                          type="text"
                          value={editForm.opportunityName}
                          onChange={(e) => setEditForm(prev => ({ ...prev, opportunityName: e.target.value }))}
                          className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary) font-semibold animate-fade-in"
                        />
                      </div>
                    ) : (
                      <>
                        <h2 className="text-lg font-bold text-foreground leading-tight truncate">{selectedLead.opportunityName}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">{selectedLead.account?.name || 'No account linked'}</p>
                      </>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className={getStageBadgeClasses(selectedLead.stage)}>
                        {selectedLead.stage}
                      </span>
                      {selectedLead.postDemoOutcome && (
                        <span className="rounded bg-sky-50 px-1.5 py-0.5 text-3xs font-semibold text-sky-800 uppercase dark:bg-sky-950/20 dark:text-sky-400">
                          {selectedLead.postDemoOutcome.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative">
                      <button 
                        onClick={() => setShowMoreMenu(prev => !prev)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                      
                      {showMoreMenu && (
                        <div className="absolute right-0 mt-1 w-32 border bg-card rounded-md shadow-lg py-1 z-20 text-xs">
                          <button
                            onClick={() => {
                              setIsEditingLead(true)
                              setEditForm({
                                opportunityName: selectedLead.opportunityName,
                                forecastCloseDate: selectedLead.forecastCloseDate ? selectedLead.forecastCloseDate.split('T')[0] : "",
                                salesRegion: selectedLead.account?.salesRegion || "US East",
                                industry: selectedLead.account?.industry || "",
                                companySize: selectedLead.account?.companySize || "",
                                competitor: selectedLead.competitor || "",
                                painPoints: selectedLead.painPoints || "",
                                dealValue: selectedLead.dealValue !== null && selectedLead.dealValue !== undefined ? Number(selectedLead.dealValue) : 0
                              })
                              setShowMoreMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted text-foreground font-medium"
                          >
                            Edit Lead
                          </button>
                          <button
                            onClick={() => {
                              setIsDeleteModalOpen(true)
                              setShowMoreMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted text-(--destructive) font-medium"
                          >
                            Delete Lead
                          </button>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedLeadId(null)
                        setIsAddingContact(false)
                        setIsLoggingActivity(false)
                        setSelectedActivityType(null)
                        setIsEditingLead(false)
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    {selectedLead.stage === 'evaluating' ? (
                      <div className="relative flex-1">
                        <button
                          onClick={() => setShowOutcomeDropdown(prev => !prev)}
                          className="w-full rounded-md bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) transition-colors hover:bg-neutral-800 shadow-sm"
                        >
                          Outcome Decisions
                        </button>
                        
                        {showOutcomeDropdown && (
                          <div className="absolute left-0 right-0 mt-1 border bg-card rounded-md shadow-lg p-2.5 z-10 space-y-2">
                            <p className="text-3xs font-bold uppercase text-muted-foreground">Select Post Demo Outcome</p>
                            <select 
                              value={postDemoOutcome}
                              onChange={(e) => setPostDemoOutcome(e.target.value)}
                              className="w-full text-xs border rounded p-1 text-foreground bg-card focus:outline-none"
                            >
                              <option value="proposal_requested">Proposal Requested</option>
                              <option value="pilot_agreed">Pilot Agreed</option>
                              <option value="internal_review">Internal Review</option>
                              <option value="not_now">Not Now (Disqualify)</option>
                              <option value="not_a_fit">Not a Fit (Disqualify)</option>
                            </select>
                            <button
                              onClick={() => handleStageTransition('deal', postDemoOutcome)}
                              className="w-full text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold"
                            >
                              Apply Outcome
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      (() => {
                        const progressionError = getStageProgressionError(selectedLead)
                        const nextStage = getNextStageLabel(selectedLead.stage)

                        return (
                          <div className="group relative flex-1">
                            <button
                              disabled={progressionError !== null}
                              onClick={() => nextStage && handleStageTransition(nextStage)}
                              className={`w-full rounded-md px-4 py-2 text-xs font-semibold shadow-sm transition-colors
                                ${progressionError 
                                  ? 'bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed'
                                  : 'bg-(--primary) text-(--primary-foreground) hover:bg-neutral-800'
                                }
                              `}
                            >
                              Move to {nextStage ? nextStage.charAt(0).toUpperCase() + nextStage.slice(1) : 'Next Stage'}
                            </button>
                            {progressionError && (
                              <div className="pointer-events-none absolute top-full left-1/2 mt-2 w-48 -translate-x-1/2 rounded bg-neutral-900 p-2 text-3xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 dark:bg-neutral-800">
                                <p className="flex items-center gap-1 leading-normal">
                                  <Info className="size-3 shrink-0 text-amber-500" />
                                  {progressionError}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })()
                    )}

                    {selectedLead.stage !== 'disqualified' && (
                      <button
                        onClick={() => setIsDisqualifyOpen(true)}
                        className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-(--destructive) transition-colors hover:bg-red-100"
                      >
                        Disqualify
                      </button>
                    )}
                  </div>

                  {/* Section 2: Overview */}
                  <div>
                    <h3 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Overview</h3>
                    {isEditingLead ? (
                      <form onSubmit={handleSaveLeadChanges} className="space-y-4 border rounded-lg p-3 bg-muted/15 text-xs animate-fade-in">
                        
                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Forecast Close Date *</label>
                          <input 
                            type="date"
                            required
                            value={editForm.forecastCloseDate}
                            onChange={(e) => setEditForm(prev => ({ ...prev, forecastCloseDate: e.target.value }))}
                            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Estimated Deal Value (USD)</label>
                          <input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.dealValue}
                            onChange={(e) => setEditForm(prev => ({ ...prev, dealValue: e.target.value }))}
                            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Sales Region *</label>
                          <select
                            value={editForm.salesRegion}
                            onChange={(e) => setEditForm(prev => ({ ...prev, salesRegion: e.target.value }))}
                            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                          >
                            <option value="US East">US East</option>
                            <option value="US West">US West</option>
                            <option value="Europe">Europe</option>
                            <option value="APAC">APAC</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Industry</label>
                          <input 
                            type="text"
                            value={editForm.industry}
                            onChange={(e) => setEditForm(prev => ({ ...prev, industry: e.target.value }))}
                            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Company Size</label>
                          <input 
                            type="text"
                            value={editForm.companySize}
                            onChange={(e) => setEditForm(prev => ({ ...prev, companySize: e.target.value }))}
                            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Competitor</label>
                          <input 
                            type="text"
                            value={editForm.competitor}
                            onChange={(e) => setEditForm(prev => ({ ...prev, competitor: e.target.value }))}
                            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Pain Points</label>
                          <textarea 
                            value={editForm.painPoints}
                            onChange={(e) => setEditForm(prev => ({ ...prev, painPoints: e.target.value }))}
                            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t mt-3">
                          <button 
                            type="button" 
                            onClick={() => setIsEditingLead(false)}
                            className="text-2xs font-semibold text-muted-foreground hover:underline"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="rounded bg-(--primary) px-3 py-1.5 text-2xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                          >
                            Save Changes
                          </button>
                        </div>

                      </form>
                    ) : (
                      <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs border rounded-lg p-3 bg-muted/5">
                        
                        {/* Open Date */}
                        <div>
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Open Date</p>
                          <p className="mt-0.5 text-foreground">
                            {selectedLead.openDate ? new Date(selectedLead.openDate).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
                            }) : "-"}
                          </p>
                        </div>

                        {/* Forecast Close Date */}
                        <div>
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Forecast Close Date</p>
                          <p className="mt-0.5 text-foreground">
                            {selectedLead.forecastCloseDate ? new Date(selectedLead.forecastCloseDate).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
                            }) : <span className="text-muted-foreground/60 italic">Not set</span>}
                          </p>
                        </div>

                        {/* Deal Value */}
                        <div>
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Deal Value</p>
                          <p className={`mt-0.5 ${(!selectedLead.dealValue || Number(selectedLead.dealValue) === 0) ? 'text-muted-foreground/60' : 'text-foreground'}`}>
                            {formatDealValue(selectedLead.dealValue)}
                          </p>
                        </div>

                        {/* Region */}
                        <div>
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Sales Region</p>
                          <p className="mt-0.5 text-foreground">{selectedLead.account?.salesRegion || "-"}</p>
                        </div>

                        {/* Industry */}
                        <div>
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Industry</p>
                          <p className="mt-0.5 text-foreground">{selectedLead.account?.industry || "-"}</p>
                        </div>

                        {/* Company Size */}
                        <div>
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Company Size</p>
                          <p className="mt-0.5 text-foreground">{selectedLead.account?.companySize || "-"}</p>
                        </div>

                        {/* Competitor */}
                        <div>
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Competitor</p>
                          <p className="mt-0.5 text-foreground">{selectedLead.competitor || <span className="text-muted-foreground/50">None tracked</span>}</p>
                        </div>


                        {/* Pain Points */}
                        <div className="col-span-2 border-t pt-2 mt-2">
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Pain Points</p>
                          <p className="mt-1 text-foreground leading-normal whitespace-pre-line">{selectedLead.painPoints || <span className="text-muted-foreground/50">None logged</span>}</p>
                        </div>

                        {/* Assigned Rep */}
                        <div className="border-t pt-2 mt-2">
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Assigned Rep</p>
                          <div className="mt-0.5 text-foreground flex items-center justify-between gap-2 relative">
                            <span>
                              {selectedLead.assignedRepName ? (
                                selectedLead.assignedRepName
                              ) : (
                                <span className="text-muted-foreground italic font-normal">Unassigned</span>
                              )}
                            </span>
                            
                            {userProfile && (userProfile.role === 'super_admin' || userProfile.role === 'manager') && (
                              <div className="inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssigningLeadId(assigningLeadId === selectedLead.id ? null : selectedLead.id);
                                  }}
                                  className="text-3xs font-semibold text-(--primary) hover:underline flex items-center gap-0.5"
                                >
                                  Reassign
                                  <ChevronDown className="size-2.5" />
                                </button>
                                {assigningLeadId === selectedLead.id && (
                                  <div className="absolute right-0 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-50 divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                                    <div className="py-1">
                                      {activeReps.length === 0 ? (
                                        <div className="px-4 py-2 text-xs text-muted-foreground">No active reps</div>
                                      ) : (
                                        activeReps.map(rep => (
                                          <button
                                            key={rep.id}
                                            type="button"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await handleAssignLeadToRep(selectedLead.id, rep.id, rep.full_name || rep.email);
                                              setAssigningLeadId(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 transition-colors"
                                          >
                                            {rep.full_name || rep.email}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Created */}
                        <div className="border-t pt-2 mt-2">
                          <p className="text-3xs font-bold uppercase text-muted-foreground">Created</p>
                          <p className="mt-0.5 text-foreground">
                            {selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            }) : "-"}
                          </p>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Section 3: Stakeholder Analysis */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Stakeholder Analysis</h3>
                      {!isAddingContact && (
                        <button 
                          onClick={() => setIsAddingContact(true)}
                          className="flex items-center gap-1 text-3xs font-semibold text-(--primary) hover:underline"
                        >
                          <Plus className="size-3" />
                          Add Contact
                        </button>
                      )}
                    </div>

                    {isAddingContact && (
                      <form onSubmit={handleAddContact} className="border rounded-lg p-3 bg-muted/20 space-y-2 mb-4 animate-fade-in text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-3xs uppercase font-bold text-muted-foreground">First Name</label>
                            <input 
                              type="text" 
                              required
                              value={newContactForm.firstName}
                              onChange={(e) => setNewContactForm(prev => ({ ...prev, firstName: e.target.value }))}
                              className="w-full border rounded p-1 text-xs text-foreground bg-card focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-3xs uppercase font-bold text-muted-foreground">Last Name</label>
                            <input 
                              type="text" 
                              required
                              value={newContactForm.lastName}
                              onChange={(e) => setNewContactForm(prev => ({ ...prev, lastName: e.target.value }))}
                              className="w-full border rounded p-1 text-xs text-foreground bg-card focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Email</label>
                          <input 
                            type="email" 
                            value={newContactForm.email}
                            onChange={(e) => setNewContactForm(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full border rounded p-1 text-xs text-foreground bg-card focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Phone</label>
                          <input 
                            type="text" 
                            value={newContactForm.phone}
                            onChange={(e) => setNewContactForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full border rounded p-1 text-xs text-foreground bg-card focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Stakeholder Role</label>
                          <select 
                            value={newContactForm.stakeholderRole}
                            onChange={(e) => setNewContactForm(prev => ({ ...prev, stakeholderRole: e.target.value }))}
                            className="w-full border rounded p-1 text-xs text-foreground bg-card focus:outline-none"
                          >
                            <option value="champion">Champion</option>
                            <option value="economic_buyer">Economic Buyer</option>
                            <option value="decision_maker">Decision Maker</option>
                            <option value="technical_validator">Technical Validator</option>
                            <option value="blocker">Blocker</option>
                          </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t mt-3">
                          <button 
                            type="button" 
                            onClick={() => setIsAddingContact(false)}
                            className="text-2xs font-semibold text-muted-foreground hover:underline"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="rounded bg-(--primary) px-3 py-1 text-2xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                          >
                            Save Stakeholder
                          </button>
                        </div>
                      </form>
                    )}

                    {selectedLead.contacts.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic bg-muted/5 border border-dashed rounded-lg p-3 text-center">
                        No stakeholders logged yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedLead.contacts.map(c => (
                          <div key={c.id} className="border rounded-lg p-2.5 bg-card flex flex-col gap-1.5 shadow-3xs">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-foreground text-xs">{c.firstName} {c.lastName}</p>
                              {c.stakeholderRole && (
                                <span className={getRoleBadgeClasses(c.stakeholderRole)}>
                                  {getRoleLabel(c.stakeholderRole)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 text-2xs text-muted-foreground">
                              {c.email && (
                                <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:underline">
                                  <Mail className="size-3" /> {c.email}
                                </a>
                              )}
                              {c.phone && (
                                <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:underline">
                                  <Phone className="size-3" /> {c.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 4: Activity Log */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Activity Log</h3>
                      {!isLoggingActivity && (
                        <div className="flex gap-1.5">
                          {(['email', 'call', 'meeting', 'presentation', 'demo'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => {
                                setSelectedActivityType(type)
                                setIsLoggingActivity(true)
                              }}
                              title={`Log ${type}`}
                              className="rounded border p-1 text-muted-foreground hover:bg-muted transition-colors"
                            >
                              {type === 'email' && <Mail className="size-3" />}
                              {type === 'call' && <Phone className="size-3" />}
                              {type === 'meeting' && <Calendar className="size-3" />}
                              {type === 'presentation' && <Monitor className="size-3" />}
                              {type === 'demo' && <Play className="size-3" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {isLoggingActivity && selectedActivityType && (
                      <form onSubmit={handleLogActivity} className="border rounded-lg p-3 bg-muted/20 space-y-2 mb-4 animate-fade-in text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-semibold text-foreground uppercase text-3xs">Log {selectedActivityType}</p>
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsLoggingActivity(false)
                              setSelectedActivityType(null)
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3" />
                          </button>
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Date</label>
                          <input 
                            type="date"
                            required
                            value={newActivityForm.activityDate}
                            onChange={(e) => setNewActivityForm(prev => ({ ...prev, activityDate: e.target.value }))}
                            className="w-full border rounded p-1 text-xs text-foreground bg-card focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-3xs uppercase font-bold text-muted-foreground">Notes / Summary</label>
                          <textarea 
                            required
                            placeholder="Provide summary detail..."
                            value={newActivityForm.note}
                            onChange={(e) => setNewActivityForm(prev => ({ ...prev, note: e.target.value }))}
                            className="w-full border rounded p-1 text-xs text-foreground bg-card focus:outline-none"
                            rows={2}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t mt-3">
                          <button 
                            type="submit" 
                            className="rounded bg-(--primary) px-3 py-1 text-2xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                          >
                            Log Activity
                          </button>
                        </div>
                      </form>
                    )}

                    {selectedLead.activities.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic bg-muted/5 border border-dashed rounded-lg p-3 text-center">
                        No activity records found.
                      </p>
                    ) : (
                      <div className="relative border-l pl-3.5 ml-2.5 space-y-4">
                        {selectedLead.activities.map(act => (
                          <div key={act.id} className="relative text-xs">
                            <span className="absolute -left-6.5 top-0.5 rounded-full border bg-card p-1 text-muted-foreground">
                              {act.activityType === 'email' && <Mail className="size-2.5" />}
                              {act.activityType === 'call' && <Phone className="size-2.5" />}
                              {act.activityType === 'meeting' && <Calendar className="size-2.5" />}
                              {act.activityType === 'presentation' && <Monitor className="size-2.5" />}
                              {act.activityType === 'demo' && <Play className="size-2.5" />}
                            </span>
                            <div className="flex justify-between">
                              <p className="font-semibold text-foreground uppercase text-3xs tracking-wider">{act.activityType}</p>
                              <span className="text-3xs text-muted-foreground font-medium">
                                {new Date(act.activityDate).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', timeZone: 'UTC'
                                })}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-2xs mt-1 leading-normal">{act.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>

      </SidebarInset>

      {/* Add Lead Modal */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 animate-fade-in">
          <Card className="w-full max-w-md p-6 bg-card border shadow-lg rounded-lg space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-lg font-bold text-foreground">Add New Lead</h2>
              <button onClick={() => setIsAddLeadOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div>
                <label className="text-3xs uppercase font-bold text-muted-foreground">Opportunity Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Acme CRM Upgrade"
                  value={newLeadForm.opportunityName}
                  onChange={(e) => setNewLeadForm(prev => ({ ...prev, opportunityName: e.target.value }))}
                  className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                />
              </div>

              {/* Account Search Input */}
              <div className="relative">
                <label className="text-3xs uppercase font-bold text-muted-foreground">Account Name *</label>
                {isAccountConfirmed ? (
                  <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400 rounded p-2 mt-1 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Check className="size-3.5" />
                      <span>{confirmedAccountName}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleClearAccount} 
                      className="text-muted-foreground hover:text-foreground text-2xs font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <>
                    <input 
                      type="text"
                      placeholder="Search existing or type to create new..."
                      value={accountQuery}
                      onChange={(e) => {
                        setAccountQuery(e.target.value)
                        setNewLeadForm(prev => ({ ...prev, accountName: e.target.value, accountId: "" }))
                        setAccountValidationError(null)
                      }}
                      className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                    />
                    
                    {filteredAccounts.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 border bg-card rounded-md shadow-lg max-h-40 overflow-y-auto z-50 divide-y">
                        {filteredAccounts.map(acc => (
                          <div 
                            key={acc.id}
                            onClick={() => {
                              setNewLeadForm(prev => ({ 
                                ...prev, 
                                accountId: acc.id, 
                                accountName: acc.name,
                                salesRegion: acc.salesRegion || prev.salesRegion
                              }))
                              setAccountQuery(acc.name)
                              setIsAccountConfirmed(true)
                              setConfirmedAccountName(acc.name)
                              setAccountValidationError(null)
                              setFilteredAccounts([])
                            }}
                            className="p-2 hover:bg-muted text-xs cursor-pointer text-foreground flex justify-between"
                          >
                            <span className="font-semibold">{acc.name}</span>
                            <span className="text-3xs text-muted-foreground">{acc.salesRegion}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {accountQuery.trim() && !allAccounts.some(a => a.name.toLowerCase() === accountQuery.toLowerCase()) && filteredAccounts.length === 0 && (
                      <div className="mt-2 border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60 rounded-md p-3 space-y-2">
                        <p className="font-bold text-foreground">{accountQuery}</p>
                        <p className="text-muted-foreground text-3xs font-medium">New account, not found in existing records</p>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={handleConfirmNewAccount}
                            className="rounded bg-(--primary) px-3 py-1.5 text-2xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                          >
                            Confirm New Account
                          </button>
                          <button 
                            type="button"
                            onClick={handleClearAccount}
                            className="text-2xs font-semibold text-muted-foreground hover:underline px-1"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {accountValidationError && (
                  <p className="mt-1 text-2xs text-(--destructive) font-semibold">
                    {accountValidationError}
                  </p>
                )}
              </div>

              {isAccountConfirmed && (
                <>
                  <div>
                    <label className="text-3xs uppercase font-bold text-muted-foreground">Sales Region *</label>
                    <select
                      value={newLeadForm.salesRegion}
                      onChange={(e) => setNewLeadForm(prev => ({ ...prev, salesRegion: e.target.value }))}
                      className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                    >
                      <option value="US East">US East</option>
                      <option value="US West">US West</option>
                      <option value="Europe">Europe</option>
                      <option value="APAC">APAC</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-3xs uppercase font-bold text-muted-foreground">Forecast Close Date *</label>
                    <input 
                      type="date"
                      required
                      value={newLeadForm.forecastCloseDate}
                      onChange={(e) => setNewLeadForm(prev => ({ ...prev, forecastCloseDate: e.target.value }))}
                      className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                    />
                  </div>

                  <div>
                    <label className="text-3xs uppercase font-bold text-muted-foreground">Estimated Deal Value (USD)</label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 350000"
                      value={newLeadForm.dealValue}
                      onChange={(e) => setNewLeadForm(prev => ({ ...prev, dealValue: e.target.value }))}
                      className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                    />
                    <p className="text-3xs text-muted-foreground mt-1">Used for pipeline and account reporting. Update as the deal progresses.</p>
                  </div>

                  <div>
                    <label className="text-3xs uppercase font-bold text-muted-foreground flex justify-between">
                      <span>Pain Points</span>
                      <span className="text-muted-foreground/60 normal-case font-medium">Recommended</span>
                    </label>
                    <textarea 
                      placeholder="Describe initial pain points or requirements..."
                      value={newLeadForm.painPoints}
                      onChange={(e) => setNewLeadForm(prev => ({ ...prev, painPoints: e.target.value }))}
                      className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                      rows={3}
                    />
                    <p className="text-3xs text-muted-foreground mt-1">Helps with handoffs and sales reporting.</p>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t mt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddLeadOpen(false)
                    handleClearAccount()
                  }}
                  className="text-xs font-semibold text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-md bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 animate-fade-in">
          <Card className="w-full max-w-sm p-5 bg-card border shadow-lg rounded-lg space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-(--destructive)" />
                Delete Lead?
              </h2>
            </div>
            
            <p className="text-xs text-muted-foreground leading-normal">
              Are you sure you want to delete this lead? This will permanently delete the lead, all of its contacts, logged activities, and stage transition history. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="rounded-md bg-red-50 p-2.5 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-3xs font-medium text-(--destructive) leading-normal animate-shake">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t mt-4">
              <button 
                type="button" 
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setDeleteError(null)
                }}
                className="text-xs font-semibold text-muted-foreground hover:underline disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteLead}
                disabled={isDeleting}
                className="rounded-md bg-(--destructive) px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Disqualify Confirmation Modal */}
      {isDisqualifyOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 animate-fade-in">
          <Card className="w-full max-w-sm p-5 bg-card border shadow-lg rounded-lg space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-(--destructive)" />
                Disqualify Lead?
              </h2>
            </div>
            
            <p className="text-xs text-muted-foreground leading-normal">
              Disqualifying this lead will change its stage to disqualified. This action cannot be undone.
            </p>

            <form onSubmit={handleDisqualify} className="space-y-3.5 text-xs">
              <div>
                <label className="text-3xs uppercase font-bold text-muted-foreground">Reason for Disqualification *</label>
                <select 
                  value={disqualifyReason}
                  onChange={(e) => setDisqualifyReason(e.target.value)}
                  className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none"
                >
                  <option value="no_budget">No Budget</option>
                  <option value="no_authority">No Authority</option>
                  <option value="no_need">No Need</option>
                  <option value="no_timing">Bad Timing</option>
                  <option value="competitor_won">Competitor Won</option>
                  <option value="unresponsive">Unresponsive</option>
                  <option value="duplicate">Duplicate</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsDisqualifyOpen(false)}
                  className="text-xs font-semibold text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-md bg-(--destructive) px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Confirm Disqualify
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </SidebarProvider>
  )
}

export default function LeadsPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#f7f7f2] dark:bg-zinc-950/40 text-xs text-muted-foreground">
        Loading Leads Workspace...
      </div>
    }>
      <LeadsPageContent />
    </React.Suspense>
  )
}
