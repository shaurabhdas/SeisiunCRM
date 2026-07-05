"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import {
  Building2,
  Filter,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  ChevronUp,
  MoreVertical,
  Trash2,
  Mail,
  Phone,
  ArrowUpDown,
  ExternalLink,
  Edit
} from "lucide-react"

import { calculateAccountHealth, AccountHealthResult } from "@/lib/accountHealth"
import { fetchAccountsWithMetrics, AccountWithMetrics, LeadSummary, ContactSummary, ActivitySummary, supabase } from "@/lib/accounts"
import { calculateDaysSinceContact, formatFollowUpDisplay, getFollowUpColorToken, formatDealValue } from "@/lib/followup"

function AccountsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlAccountId = searchParams.get('account')

  // Accounts state
  const [accounts, setAccounts] = React.useState<AccountWithMetrics[]>([])
  const [regions, setRegions] = React.useState<string[]>([])
  const [industries, setIndustries] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filters
  const [selectedRegion, setSelectedRegion] = React.useState<string>("All Regions")
  const [selectedIndustry, setSelectedIndustry] = React.useState<string>("All Industries")

  // Selected Account (Zone C) - synchronized with URL silently via history.replaceState
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null)

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({
    overview: false,
    leads: false,
    contacts: false,
    activities: false
  })

  // Modals / Forms visibility
  const [isAddAccountOpen, setIsAddAccountOpen] = React.useState(false)
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = React.useState(false)
  const [isEditingAccount, setIsEditingAccount] = React.useState(false)

  // Inline forms in Zone C
  const [isAddingLead, setIsAddingLead] = React.useState(false)
  const [isAddingContact, setIsAddingContact] = React.useState(false)

  // Dropdown menu state
  const [showMoreMenu, setShowMoreMenu] = React.useState(false)

  // New/Edit account form states
  const [newAccountForm, setNewAccountForm] = React.useState({
    name: "",
    industry: "",
    companySize: "",
    salesRegion: "US East",
    notes: ""
  })

  const [editForm, setEditForm] = React.useState({
    name: "",
    industry: "",
    companySize: "",
    salesRegion: "US East",
    notes: ""
  })

  // New Lead form state (inline in Section 3)
  const [newLeadForm, setNewLeadForm] = React.useState({
    opportunityName: "",
    forecastCloseDate: "",
    dealValue: "" as string | number,
    painPoints: ""
  })

  // New Contact form state (inline in Section 4)
  const [newContactForm, setNewContactForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    stakeholderRole: "champion",
    leadId: ""
  })

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  React.useEffect(() => {
    loadAccountsData()
  }, [])

  const loadAccountsData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`/api/accounts?t=${Date.now()}`)
      if (!res.ok) throw new Error("Failed to fetch accounts")
      const data = await res.json()
      setAccounts(data)

      // Extract distinct regions
      const distinctRegions = Array.from(new Set(data.map((a: any) => a.sales_region).filter(Boolean))) as string[]
      setRegions(distinctRegions)

      // Extract distinct industries
      const distinctIndustries = Array.from(new Set(data.map((a: any) => a.industry).filter(Boolean))) as string[]
      setIndustries(distinctIndustries)
    } catch (err) {
      console.error("Error loading accounts data:", err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Set initial selection from URL query param on mount
  React.useEffect(() => {
    const initialParam = searchParams.get('account')
    if (initialParam) {
      setSelectedAccountId(initialParam)
    }
  }, [])

  // Silently sync state back to URL query param (without triggering Next.js router transitions/flicker)
  React.useEffect(() => {
    if (selectedAccountId) {
      window.history.replaceState(null, '', `/accounts?account=${selectedAccountId}`)
    } else {
      window.history.replaceState(null, '', '/accounts')
    }
  }, [selectedAccountId])

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  // Toggle collapsible section
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Add Account handler
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccountForm.name.trim()) return

    try {
      const res = await fetch('/api/accounts', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAccountForm.name,
          industry: newAccountForm.industry || null,
          company_size: newAccountForm.companySize || null,
          sales_region: newAccountForm.salesRegion,
          notes: newAccountForm.notes || null
        })
      })

      if (!res.ok) throw new Error("Failed to create account")
      const createdAccount = await res.json()

      setIsAddAccountOpen(false)
      setNewAccountForm({
        name: "",
        industry: "",
        companySize: "",
        salesRegion: "US East",
        notes: ""
      })

      // Immediately open Zone C for new account by setting state
      setSelectedAccountId(createdAccount.id)

      // Refetch accounts in the background silently
      await loadAccountsData(true)
    } catch (err) {
      console.error("Error creating account:", err)
    }
  }

  // Edit Account handler
  const handleSaveAccountChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccountId) return

    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          industry: editForm.industry || null,
          company_size: editForm.companySize || null,
          sales_region: editForm.salesRegion,
          notes: editForm.notes || null
        })
      })

      if (!res.ok) throw new Error("Failed to update account")

      await loadAccountsData(true)
      setIsEditingAccount(false)
    } catch (err) {
      console.error("Error updating account:", err)
    }
  }

  const handleDeleteAccount = async () => {
    if (!selectedAccountId) return

    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}`, {
        method: "DELETE"
      })

      if (!res.ok) throw new Error("Failed to delete account")

      setSelectedAccountId(null)
      setIsDeleteAccountOpen(false)
      await loadAccountsData(true)
    } catch (err) {
      console.error("Error deleting account cascade:", err)
    }
  }

  // Add Lead under this account handler
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccount || !newLeadForm.opportunityName.trim()) return

    try {
      const res = await fetch(`${apiUrl}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityName: newLeadForm.opportunityName,
          accountName: selectedAccount.name,
          accountId: selectedAccount.id,
          salesRegion: selectedAccount.sales_region || "US East",
          forecastCloseDate: newLeadForm.forecastCloseDate,
          painPoints: newLeadForm.painPoints,
          dealValue: newLeadForm.dealValue !== "" && newLeadForm.dealValue !== null ? Number(newLeadForm.dealValue) : 0
        })
      })

      if (res.ok) {
        await loadAccountsData(true)
        setIsAddingLead(false)
        setNewLeadForm({
          opportunityName: "",
          forecastCloseDate: "",
          dealValue: "",
          painPoints: ""
        })
      }
    } catch (err) {
      console.error("Error adding lead:", err)
    }
  }

  // Add Contact handler
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccountId || !newContactForm.firstName || !newContactForm.lastName || !newContactForm.leadId) return

    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          first_name: newContactForm.firstName,
          last_name: newContactForm.lastName,
          email: newContactForm.email || null,
          phone: newContactForm.phone || null,
          stakeholder_role: newContactForm.stakeholderRole || null,
          lead_id: newContactForm.leadId,
          account_id: selectedAccountId
        })

      if (error) throw error

      await loadAccountsData(true)
      setIsAddingContact(false)
      setNewContactForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        stakeholderRole: "champion",
        leadId: ""
      })
    } catch (err) {
      console.error("Error creating contact:", err)
    }
  }

  // Helper: map a band to CSS styling classes
  const getBandClasses = (band: string) => {
    switch (band) {
      case "Healthy":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
      case "Developing":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900"
      case "At Risk":
        return "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200 dark:border-orange-900"
      default:
        return "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900"
    }
  }

  // Health Pill background styles in Section 1 Header
  const getHealthPillStyles = (band: string) => {
    switch (band) {
      case "Healthy":
        return "bg-(--followup-safe) text-white font-semibold"
      case "Developing":
        return "bg-(--followup-warning) text-neutral-800 font-semibold"
      case "At Risk":
        return "bg-(--followup-urgent) text-white font-semibold"
      default:
        return "bg-(--followup-critical) text-white font-semibold"
    }
  }

  // 1. Calculate health metrics client-side and filter data
  const accountsWithHealth = accounts.map(a => {
    const health = calculateAccountHealth({
      lastActivityDays: a.lastActivityDays,
      stakeholderCoverage: {
        hasChampion: a.hasChampion,
        hasEconomicBuyer: a.hasEconomicBuyer
      },
      furthestStage: a.furthestStage,
      totalDealValue: a.totalDealValue,
      hasLeadAtConnectedOrBeyond: a.hasLeadAtConnectedOrBeyond
    })
    return { ...a, health }
  })

  // Apply Region/Industry filters
  const filteredAccounts = accountsWithHealth.filter(a => {
    const regionMatch = selectedRegion === "All Regions" || a.sales_region === selectedRegion
    const industryMatch = selectedIndustry === "All Industries" || a.industry === selectedIndustry
    return regionMatch && industryMatch
  })

  // Default sort: Health score ascending
  filteredAccounts.sort((a, b) => a.health.score - b.health.score)

  // Calculations for Stat Chips
  const totalAccountsCount = accounts.length
  
  // Active Pipeline: Sum of deal_value across all non-disqualified active leads
  let activePipelineSum = 0
  accounts.forEach(a => {
    a.leads.forEach(l => {
      if (l.stage !== 'disqualified') {
        activePipelineSum += Number(l.deal_value || 0)
      }
    })
  })

  // Needs Attention: lastActivityDays >= 7 or is null
  const needsAttentionCount = accounts.filter(a => a.lastActivityDays === null || a.lastActivityDays >= 7).length

  // No Stakeholders: hasChampion and hasEconomicBuyer are both false
  const noStakeholdersCount = accounts.filter(a => !a.hasChampion && !a.hasEconomicBuyer).length

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
              <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">Pipeline Intelligence</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">Accounts</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Organisation-level pipeline health and relationship coverage</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Region Filter */}
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

              {/* Industry Filter */}
              <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 shadow-2xs">
                <Filter className="size-3.5 text-muted-foreground" />
                <select 
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer text-foreground"
                >
                  <option value="All Industries">All Industries</option>
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              {/* Add Account Button */}
              <button 
                onClick={() => setIsAddAccountOpen(true)}
                className="flex items-center gap-1.5 rounded-md bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) transition-colors hover:bg-neutral-800 shadow-sm"
              >
                <Plus className="size-4" />
                Add Account
              </button>
            </div>
          </div>

          {/* ZONE A Stat Chips */}
          <div className="grid grid-cols-1 gap-4 px-4 py-6 md:grid-cols-4 lg:px-6">
            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Total Accounts</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{totalAccountsCount}</p>
              <p className="mt-1 text-2xs text-muted-foreground">Registered organisations</p>
            </Card>

            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Active Pipeline</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {formatDealValue(activePipelineSum)}
              </p>
              <p className="mt-1 text-2xs text-muted-foreground">Sum of active deal values</p>
            </Card>

            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Needs Attention</p>
              <p className={`mt-2 text-3xl font-bold tracking-tight ${needsAttentionCount > 0 ? 'text-(--followup-urgent)' : 'text-(--followup-safe)'}`}>
                {needsAttentionCount}
              </p>
              <p className="mt-1 text-2xs text-muted-foreground">&gt;= 7 days inactive or no contact</p>
            </Card>

            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">No Stakeholders</p>
              <p className={`mt-2 text-3xl font-bold tracking-tight ${noStakeholdersCount > 0 ? 'text-(--destructive)' : 'text-(--followup-safe)'}`}>
                {noStakeholdersCount}
              </p>
              <p className="mt-1 text-2xs text-muted-foreground">Neither Champion nor Buyer identified</p>
            </Card>
          </div>

          {/* MAIN ZONE B / C Wrapper */}
          <div className="flex flex-1 gap-5 px-4 lg:px-6 overflow-hidden min-h-0">
            
            {/* ZONE B: Accounts Table */}
            <div className={`flex flex-col gap-3 transition-all duration-300 ${selectedAccountId ? 'w-2/3' : 'w-full'}`}>
              {loading ? (
                <div className="flex flex-1 items-center justify-center p-12 text-xs text-muted-foreground">
                  Loading accounts...
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center border border-dashed rounded-lg bg-card p-12 text-center">
                  <Building2 className="size-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-semibold text-foreground">No accounts match your filters</p>
                  <button 
                    onClick={() => { setSelectedRegion("All Regions"); setSelectedIndustry("All Industries"); }}
                    className="mt-2 text-xs font-semibold text-(--primary) hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border bg-card shadow-2xs overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30 font-semibold text-muted-foreground uppercase text-3xs tracking-wider">
                        <th className="p-3">Account</th>
                        <th className="p-3">Region</th>
                        <th className="p-3 text-center">Open Leads</th>
                        <th className="p-3">Pipeline Value</th>
                        <th className="p-3 text-center">Stakeholders</th>
                        <th className="p-3">Last Activity</th>
                        <th className="p-3">Health</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((account) => {
                        const isSelected = account.id === selectedAccountId
                        const isCritical = account.health.band === 'Critical'
                        
                        // Left border highlights
                        let borderStyle = {}
                        if (isSelected) {
                          borderStyle = { borderLeft: "3px solid var(--stage-connected-bg)" }
                        } else if (isCritical) {
                          borderStyle = { borderLeft: "3px solid var(--followup-critical)" }
                        }

                        // Last activity followup values
                        const lastActivityDisplay = formatFollowUpDisplay(account.lastActivityDays)
                        const lastActivityColor = getFollowUpColorToken(account.lastActivityDays)

                        return (
                          <tr 
                            key={account.id}
                            style={borderStyle}
                            onClick={() => setSelectedAccountId(account.id)}
                            className={`cursor-pointer transition-colors hover:bg-(--secondary) border-b last:border-0
                              ${isSelected ? 'bg-indigo-50/20 dark:bg-indigo-950/5 font-medium' : 'bg-card'}
                            `}
                          >
                            <td className="p-3">
                              <p className="font-semibold text-foreground text-xs leading-none">{account.name}</p>
                              <p className="text-2xs text-muted-foreground mt-1">{account.industry || 'No industry specified'}</p>
                            </td>
                            <td className="p-3 text-foreground">{account.sales_region || '-'}</td>
                            <td className="p-3 text-center text-foreground font-medium">{account.openLeadsCount}</td>
                            <td className="p-3 text-foreground font-medium">
                              {account.totalDealValue > 0 ? (
                                formatDealValue(account.totalDealValue)
                              ) : (
                                <span className="text-muted-foreground/60">Not entered</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Champion Dot */}
                                <div 
                                  className={`size-2.5 rounded-full ${account.hasChampion ? 'bg-(--followup-safe)' : 'bg-(--followup-critical)'}`}
                                  title={account.hasChampion ? "Champion Identified" : "No Champion"}
                                />
                                {/* Economic Buyer Dot */}
                                <div 
                                  className={`size-2.5 rounded-full ${account.hasEconomicBuyer ? 'bg-(--followup-safe)' : 'bg-(--followup-critical)'}`}
                                  title={account.hasEconomicBuyer ? "Economic Buyer Identified" : "No Economic Buyer"}
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: `var(${lastActivityColor})` }} />
                                <span className="font-semibold text-foreground text-2xs">{lastActivityDisplay}</span>
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-foreground">
                              {account.health.score}{' '}
                              <span className="font-bold ml-1" style={{ color: `var(${account.health.bandColor})` }}>
                                {account.health.band}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ZONE C: Account Detail Panel */}
            {selectedAccountId && (
              <div className="w-1/3 border rounded-lg bg-card shadow-sm flex flex-col overflow-hidden animate-slide-in h-full">
                {!selectedAccount ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-(--primary) mb-2"></div>
                    <p className="text-3xs font-semibold uppercase tracking-wider text-muted-foreground/85">Loading Account Details...</p>
                  </div>
                ) : (
                  <>
                
                {/* Section 1: Detail Panel Header */}
                <div className="flex items-start justify-between border-b p-4 bg-muted/10 shrink-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <h2 className="text-sm font-extrabold text-foreground leading-snug break-words pr-2">{selectedAccount.name}</h2>
                    <p className="text-3xs font-medium text-muted-foreground mt-0.5">
                      {[selectedAccount.industry, selectedAccount.sales_region].filter(Boolean).join(", ")}
                    </p>
                    
                    {/* Health pill */}
                    {(() => {
                      const health = calculateAccountHealth({
                        lastActivityDays: selectedAccount.lastActivityDays,
                        stakeholderCoverage: {
                          hasChampion: selectedAccount.hasChampion,
                          hasEconomicBuyer: selectedAccount.hasEconomicBuyer
                        },
                        furthestStage: selectedAccount.furthestStage,
                        totalDealValue: selectedAccount.totalDealValue,
                        hasLeadAtConnectedOrBeyond: selectedAccount.hasLeadAtConnectedOrBeyond
                      })
                      return (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-3xs border">
                          <span className={`inline-block size-2 rounded-full ${getHealthPillStyles(health.band)}`} />
                          <span className="font-bold text-foreground">{health.score} {health.band}</span>
                        </div>
                      )
                    })()}
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
                        <div className="absolute right-0 mt-1 w-36 border bg-card rounded-md shadow-lg py-1 z-20 text-xs">
                          <button
                            onClick={() => {
                              setIsEditingAccount(true)
                              setEditForm({
                                name: selectedAccount.name,
                                industry: selectedAccount.industry || "",
                                companySize: selectedAccount.company_size || "",
                                salesRegion: selectedAccount.sales_region || "US East",
                                notes: selectedAccount.notes || ""
                              })
                              setShowMoreMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted text-foreground font-medium flex items-center gap-1.5"
                          >
                            <Edit className="size-3.5" />
                            Edit Account
                          </button>
                          <button
                            onClick={() => {
                              setIsDeleteAccountOpen(true)
                              setShowMoreMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted text-(--destructive) font-medium flex items-center gap-1.5"
                          >
                            <Trash2 className="size-3.5" />
                            Delete Account
                          </button>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setSelectedAccountId(null)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible Content Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">

                  {/* Section 2: Overview */}
                  <div className="border-b pb-4">
                    <button 
                      onClick={() => toggleSection('overview')}
                      className="flex w-full items-center justify-between font-bold text-2xs uppercase tracking-wider text-muted-foreground mb-3"
                    >
                      <span>Overview</span>
                      {collapsedSections.overview ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>

                    {!collapsedSections.overview && (
                      isEditingAccount ? (
                        <form onSubmit={handleSaveAccountChanges} className="space-y-3.5 border rounded-lg p-3 bg-muted/15 animate-fade-in">
                          <div>
                            <label className="text-3xs uppercase font-bold text-muted-foreground">Account Name *</label>
                            <input 
                              type="text"
                              required
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                            />
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
                            <label className="text-3xs uppercase font-bold text-muted-foreground">Notes</label>
                            <textarea 
                              value={editForm.notes}
                              onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Add notes about this organisation..."
                              className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                              rows={3}
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t mt-3">
                            <button 
                              type="button" 
                              onClick={() => setIsEditingAccount(false)}
                              className="text-2xs font-semibold text-muted-foreground hover:underline"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              className="rounded bg-(--primary) px-3 py-1.5 text-2xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs leading-normal">
                          <div>
                            <p className="text-3xs font-bold uppercase text-muted-foreground">Industry</p>
                            <p className="mt-0.5 text-foreground">{selectedAccount.industry || "-"}</p>
                          </div>
                          <div>
                            <p className="text-3xs font-bold uppercase text-muted-foreground">Company Size</p>
                            <p className="mt-0.5 text-foreground">{selectedAccount.company_size || "-"}</p>
                          </div>
                          <div>
                            <p className="text-3xs font-bold uppercase text-muted-foreground">Sales Region</p>
                            <p className="mt-0.5 text-foreground">{selectedAccount.sales_region || "-"}</p>
                          </div>
                          
                          {/* Notes */}
                          <div className="col-span-2 border-t pt-2.5 mt-1">
                            <p className="text-3xs font-bold uppercase text-muted-foreground">Notes</p>
                            <p className="mt-1 text-foreground leading-normal whitespace-pre-line">
                              {selectedAccount.notes || <span className="text-muted-foreground/50 italic">Add notes about this organisation...</span>}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Section 3: Leads Under This Account */}
                  <div className="border-b pb-4">
                    <button 
                      onClick={() => toggleSection('leads')}
                      className="flex w-full items-center justify-between font-bold text-2xs uppercase tracking-wider text-muted-foreground mb-3"
                    >
                      <span>Leads ({selectedAccount.leads.length})</span>
                      {collapsedSections.leads ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>

                    {!collapsedSections.leads && (
                      <div className="space-y-3">
                        {selectedAccount.leads.length === 0 ? (
                          <div className="border border-dashed rounded-lg p-4 text-center bg-muted/5">
                            <p className="text-muted-foreground text-xs">No active leads under this account.</p>
                            
                            {!isAddingLead ? (
                              <button 
                                onClick={() => setIsAddingLead(true)}
                                className="mt-2 inline-flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-(--primary) hover:underline"
                              >
                                <Plus className="size-3" />
                                Add Lead
                              </button>
                            ) : (
                              <form onSubmit={handleAddLead} className="mt-3 space-y-3 text-left border-t pt-3">
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Opportunity Name *</label>
                                  <input 
                                    type="text"
                                    required
                                    value={newLeadForm.opportunityName}
                                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, opportunityName: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Forecast Close Date *</label>
                                  <input 
                                    type="date"
                                    required
                                    value={newLeadForm.forecastCloseDate}
                                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, forecastCloseDate: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
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
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Pain Points</label>
                                  <textarea 
                                    value={newLeadForm.painPoints}
                                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, painPoints: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                    rows={2}
                                  />
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button 
                                    type="button" 
                                    onClick={() => setIsAddingLead(false)}
                                    className="text-3xs font-semibold text-muted-foreground hover:underline"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="submit"
                                    className="rounded bg-(--primary) px-2.5 py-1 text-3xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                                  >
                                    Create Lead
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedAccount.leads.map((lead) => {
                              const daysSince = calculateDaysSinceContact(lead.last_connect_date)
                              const followUpDisplay = formatFollowUpDisplay(daysSince)
                              const followUpColor = getFollowUpColorToken(daysSince)

                              return (
                                <div key={lead.id} className="flex items-center justify-between border rounded-lg p-2.5 bg-card hover:bg-muted/10 transition-colors">
                                  <div className="min-w-0 pr-2">
                                    <p className="font-semibold text-foreground truncate">{lead.opportunity_name}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      {/* Stage label */}
                                      <span className="rounded bg-neutral-100 dark:bg-neutral-800 text-3xs font-semibold uppercase px-1.5 py-0.5 text-muted-foreground">
                                        {lead.stage}
                                      </span>
                                      
                                      {/* Followup indicator */}
                                      <div className="flex items-center gap-1">
                                        <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: `var(${followUpColor})` }} />
                                        <span className="text-3xs font-semibold text-muted-foreground">{followUpDisplay}</span>
                                      </div>

                                      {/* Deal Value */}
                                      <span className="text-3xs font-semibold text-muted-foreground">
                                        {lead.deal_value > 0 ? formatDealValue(lead.deal_value) : 'No value'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <Link 
                                    href={`/leads?lead=${lead.id}`}
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted shrink-0 flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-(--primary)"
                                  >
                                    <span>View</span>
                                    <ExternalLink className="size-3" />
                                  </Link>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 4: Contacts */}
                  <div className="border-b pb-4">
                    <button 
                      onClick={() => toggleSection('contacts')}
                      className="flex w-full items-center justify-between font-bold text-2xs uppercase tracking-wider text-muted-foreground mb-3"
                    >
                      <span>Contacts ({selectedAccount.contacts.length})</span>
                      {collapsedSections.contacts ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>

                    {!collapsedSections.contacts && (
                      <div className="space-y-3">
                        {selectedAccount.contacts.length === 0 ? (
                          <div className="border border-dashed rounded-lg p-4 text-center bg-muted/5">
                            <p className="text-muted-foreground text-xs">No contacts logged for this account.</p>
                            
                            {!isAddingContact ? (
                              <button 
                                onClick={() => {
                                  if (selectedAccount.leads.length === 0) {
                                    alert("Please create a lead under this account first so the contact can be associated.")
                                    return
                                  }
                                  setIsAddingContact(true)
                                  setNewContactForm(prev => ({ ...prev, leadId: selectedAccount.leads[0]?.id || "" }))
                                }}
                                className="mt-2 inline-flex items-center gap-1 text-3xs font-bold uppercase tracking-wider text-(--primary) hover:underline"
                              >
                                <Plus className="size-3" />
                                Add Contact
                              </button>
                            ) : (
                              <form onSubmit={handleAddContact} className="mt-3 space-y-3 text-left border-t pt-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-3xs uppercase font-bold text-muted-foreground">First Name *</label>
                                    <input 
                                      type="text"
                                      required
                                      value={newContactForm.firstName}
                                      onChange={(e) => setNewContactForm(prev => ({ ...prev, firstName: e.target.value }))}
                                      className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-3xs uppercase font-bold text-muted-foreground">Last Name *</label>
                                    <input 
                                      type="text"
                                      required
                                      value={newContactForm.lastName}
                                      onChange={(e) => setNewContactForm(prev => ({ ...prev, lastName: e.target.value }))}
                                      className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Email</label>
                                  <input 
                                    type="email"
                                    value={newContactForm.email}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Phone</label>
                                  <input 
                                    type="text"
                                    value={newContactForm.phone}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Stakeholder Role</label>
                                  <select
                                    value={newContactForm.stakeholderRole}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, stakeholderRole: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  >
                                    <option value="champion">Champion</option>
                                    <option value="economic_buyer">Economic Buyer</option>
                                    <option value="influencer">Influencer</option>
                                    <option value="technical_buyer">Technical Buyer</option>
                                    <option value="user_buyer">User Buyer</option>
                                    <option value="gatekeeper">Gatekeeper</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Associated Lead *</label>
                                  <select
                                    value={newContactForm.leadId}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, leadId: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  >
                                    {selectedAccount.leads.map(l => (
                                      <option key={l.id} value={l.id}>{l.opportunity_name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button 
                                    type="button" 
                                    onClick={() => setIsAddingContact(false)}
                                    className="text-3xs font-semibold text-muted-foreground hover:underline"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="submit"
                                    className="rounded bg-(--primary) px-2.5 py-1 text-3xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                                  >
                                    Add Contact
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedAccount.contacts.map((contact) => (
                              <div key={contact.id} className="border rounded-lg p-2.5 bg-card space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-foreground">{contact.first_name} {contact.last_name}</p>
                                  {contact.stakeholder_role && (
                                    <span className="rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 text-3xs font-semibold uppercase px-1.5 py-0.5">
                                      {contact.stakeholder_role.replace('_', ' ')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-3xs font-medium text-muted-foreground mt-1">
                                  {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="hover:text-foreground flex items-center gap-1">
                                      <Mail className="size-3 shrink-0" />
                                      {contact.email}
                                    </a>
                                  )}
                                  {contact.phone && (
                                    <a href={`tel:${contact.phone}`} className="hover:text-foreground flex items-center gap-1">
                                      <Phone className="size-3 shrink-0" />
                                      {contact.phone}
                                    </a>
                                  )}
                                </div>
                                {(() => {
                                  const associatedLead = selectedAccount.leads.find(l => l.id === contact.lead_id)
                                  return associatedLead ? (
                                    <p className="text-3xs text-muted-foreground/75 mt-1 border-t pt-1.5">
                                      Lead: <span className="font-medium text-foreground">{associatedLead.opportunity_name}</span>
                                    </p>
                                  ) : null
                                })()}
                              </div>
                            ))}
                            {/* Inline Add button when lists exist */}
                            {!isAddingContact && (
                              <button 
                                onClick={() => {
                                  if (selectedAccount.leads.length === 0) {
                                    alert("Please create a lead under this account first.")
                                    return
                                  }
                                  setIsAddingContact(true)
                                  setNewContactForm(prev => ({ ...prev, leadId: selectedAccount.leads[0]?.id || "" }))
                                }}
                                className="w-full text-center py-1.5 border border-dashed rounded-lg text-3xs font-semibold text-muted-foreground hover:text-foreground transition-colors mt-2"
                              >
                                + Add Another Contact
                              </button>
                            )}
                            {isAddingContact && (
                              <form onSubmit={handleAddContact} className="mt-3 space-y-3 border p-3 rounded-lg bg-muted/5 text-left">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-3xs uppercase font-bold text-muted-foreground">First Name *</label>
                                    <input 
                                      type="text"
                                      required
                                      value={newContactForm.firstName}
                                      onChange={(e) => setNewContactForm(prev => ({ ...prev, firstName: e.target.value }))}
                                      className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-3xs uppercase font-bold text-muted-foreground">Last Name *</label>
                                    <input 
                                      type="text"
                                      required
                                      value={newContactForm.lastName}
                                      onChange={(e) => setNewContactForm(prev => ({ ...prev, lastName: e.target.value }))}
                                      className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Email</label>
                                  <input 
                                    type="email"
                                    value={newContactForm.email}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Phone</label>
                                  <input 
                                    type="text"
                                    value={newContactForm.phone}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Stakeholder Role</label>
                                  <select
                                    value={newContactForm.stakeholderRole}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, stakeholderRole: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  >
                                    <option value="champion">Champion</option>
                                    <option value="economic_buyer">Economic Buyer</option>
                                    <option value="influencer">Influencer</option>
                                    <option value="technical_buyer">Technical Buyer</option>
                                    <option value="user_buyer">User Buyer</option>
                                    <option value="gatekeeper">Gatekeeper</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-3xs uppercase font-bold text-muted-foreground">Associated Lead *</label>
                                  <select
                                    value={newContactForm.leadId}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, leadId: e.target.value }))}
                                    className="w-full border rounded p-1.5 mt-1 text-xs text-foreground bg-card focus:outline-none"
                                  >
                                    {selectedAccount.leads.map(l => (
                                      <option key={l.id} value={l.id}>{l.opportunity_name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex justify-end gap-2 pt-1 border-t mt-2">
                                  <button 
                                    type="button" 
                                    onClick={() => setIsAddingContact(false)}
                                    className="text-3xs font-semibold text-muted-foreground hover:underline"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="submit"
                                    className="rounded bg-(--primary) px-2.5 py-1 text-3xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                                  >
                                    Add Contact
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section 5: Activity Timeline */}
                  <div>
                    <button 
                      onClick={() => toggleSection('activities')}
                      className="flex w-full items-center justify-between font-bold text-2xs uppercase tracking-wider text-muted-foreground mb-3"
                    >
                      <span>Activity Timeline ({selectedAccount.recentActivities.length})</span>
                      {collapsedSections.activities ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>

                    {!collapsedSections.activities && (
                      <div className="space-y-3">
                        {selectedAccount.recentActivities.length === 0 ? (
                          <p className="text-muted-foreground italic text-center py-4">No activity recorded for this account yet.</p>
                        ) : (
                          <div className="relative border-l pl-4 ml-2.5 py-2 space-y-4">
                            {selectedAccount.recentActivities.map((act) => (
                              <div key={act.id} className="relative">
                                {/* Timeline Bullet Indicator */}
                                <div className="absolute -left-[21.5px] top-0.5 size-3 rounded-full border-2 border-card bg-zinc-400 dark:bg-zinc-600" />
                                
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-foreground text-3xs uppercase tracking-wide">
                                      {act.activity_type.toUpperCase()}
                                    </span>
                                    <span className="text-3xs text-muted-foreground">
                                      {new Date(act.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                                    </span>
                                  </div>
                                  <p className="text-3xs text-muted-foreground/80">
                                    Lead: <span className="font-medium text-foreground">{act.opportunity_name}</span>
                                  </p>
                                  {act.note && (
                                    <p className="mt-1 text-foreground text-2xs bg-muted/20 border rounded p-2 leading-relaxed whitespace-pre-line">
                                      {act.note}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </SidebarInset>

      {/* Add Account Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-2xs flex items-center justify-center z-50 animate-fade-in p-4">
          <Card className="w-full max-w-md bg-card border rounded-lg shadow-xl p-5 relative">
            <button 
              onClick={() => setIsAddAccountOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>

            <h2 className="text-lg font-bold text-foreground">Add Account</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Create a new organisation profile to track health and stakeholders.</p>

            <form onSubmit={handleCreateAccount} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-3xs uppercase font-bold text-muted-foreground">Account Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={newAccountForm.name}
                  onChange={(e) => setNewAccountForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-3xs uppercase font-bold text-muted-foreground">Industry</label>
                  <input 
                    type="text"
                    placeholder="e.g. Technology"
                    value={newAccountForm.industry}
                    onChange={(e) => setNewAccountForm(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                  />
                </div>
                <div>
                  <label className="text-3xs uppercase font-bold text-muted-foreground">Company Size</label>
                  <input 
                    type="text"
                    placeholder="e.g. Enterprise"
                    value={newAccountForm.companySize}
                    onChange={(e) => setNewAccountForm(prev => ({ ...prev, companySize: e.target.value }))}
                    className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                  />
                </div>
              </div>

              <div>
                <label className="text-3xs uppercase font-bold text-muted-foreground">Sales Region *</label>
                <select
                  value={newAccountForm.salesRegion}
                  onChange={(e) => setNewAccountForm(prev => ({ ...prev, salesRegion: e.target.value }))}
                  className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                >
                  <option value="US East">US East</option>
                  <option value="US West">US West</option>
                  <option value="Europe">Europe</option>
                  <option value="APAC">APAC</option>
                </select>
              </div>

              <div>
                <label className="text-3xs uppercase font-bold text-muted-foreground">Notes</label>
                <textarea 
                  value={newAccountForm.notes}
                  onChange={(e) => setNewAccountForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Initial notes about this account..."
                  className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddAccountOpen(false)}
                  className="text-xs font-semibold text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-md bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800"
                >
                  Save Account
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Account Cascade Confirmation Modal */}
      {isDeleteAccountOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-2xs flex items-center justify-center z-50 animate-fade-in p-4">
          <Card className="w-full max-w-sm bg-card border rounded-lg shadow-xl p-5 relative">
            <button 
              onClick={() => setIsDeleteAccountOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>

            <h2 className="text-sm font-bold text-foreground">Confirm Delete</h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              This will permanently delete this account. All leads and contacts under this account will also be deleted. This cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <button 
                type="button" 
                onClick={() => setIsDeleteAccountOpen(false)}
                className="text-xs font-semibold text-muted-foreground hover:underline"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="rounded-md bg-(--destructive) px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </Card>
        </div>
      )}

    </SidebarProvider>
  )
}

export default function AccountsPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#f7f7f2] dark:bg-zinc-950/40 text-xs text-muted-foreground">
        Loading Accounts Workspace...
      </div>
    }>
      <AccountsPageContent />
    </React.Suspense>
  )
}
