"use client"

import * as React from "react"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import {
  Contact as ContactIcon,
  Plus,
  X,
  Pencil,
  Mail,
  Phone,
  ExternalLink,
  Search,
  Loader2,
  Lock,
  Trash2,
} from "lucide-react"

type CurrentUser = {
  id: string
  role: string
}

type ContactRecord = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  organization: string | null
  stakeholderRole: string | null
  leadId: string | null
  accountId: string | null
  dealId: string | null
  createdBy: string | null
  createdByName: string | null
  createdAt: string
  lead: { id: string; opportunityName: string } | null
  account: { id: string; name: string } | null
  deal: { id: string; opportunityName: string } | null
}

type Option = { id: string; label: string }

const STAKEHOLDER_ROLES: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic Buyer",
  influencer: "Influencer",
  technical_buyer: "Technical Buyer",
  user_buyer: "User Buyer",
  gatekeeper: "Gatekeeper",
}

type ContactForm = {
  name: string
  phone: string
  email: string
  organization: string
  stakeholderRole: string
  leadId: string
  accountId: string
  dealId: string
}

const blankForm: ContactForm = {
  name: "",
  phone: "",
  email: "",
  organization: "",
  stakeholderRole: "",
  leadId: "",
  accountId: "",
  dealId: "",
}

function recordToForm(c: ContactRecord): ContactForm {
  return {
    name: c.name || "",
    phone: c.phone || "",
    email: c.email || "",
    organization: c.organization || "",
    stakeholderRole: c.stakeholderRole || "",
    leadId: c.leadId || "",
    accountId: c.accountId || "",
    dealId: c.dealId || "",
  }
}

function ContactFormFields({
  form,
  setForm,
  leads,
  accounts,
  deals,
  disabledFields,
}: {
  form: ContactForm
  setForm: React.Dispatch<React.SetStateAction<ContactForm>>
  leads: Option[]
  accounts: Option[]
  deals: Option[]
  disabledFields: boolean
}) {
  const fieldClass = "w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary) disabled:opacity-50 disabled:cursor-not-allowed"
  return (
    <div className="space-y-3.5">
      {disabledFields && (
        <div className="flex items-center gap-1.5 text-3xs font-semibold text-muted-foreground bg-muted/30 border rounded px-2.5 py-1.5">
          <Lock className="size-3 shrink-0" />
          Only a manager or super admin can change these details. You can still update the associated Lead, Account, or Deal below.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-3xs uppercase font-bold text-muted-foreground">Name</label>
          <input
            type="text"
            disabled={disabledFields}
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="text-3xs uppercase font-bold text-muted-foreground">Contact Number</label>
          <input
            type="text"
            disabled={disabledFields}
            value={form.phone}
            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-3xs uppercase font-bold text-muted-foreground">Email Address</label>
          <input
            type="email"
            disabled={disabledFields}
            value={form.email}
            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="text-3xs uppercase font-bold text-muted-foreground">Organization</label>
          <input
            type="text"
            disabled={disabledFields}
            value={form.organization}
            onChange={(e) => setForm(prev => ({ ...prev, organization: e.target.value }))}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className="text-3xs uppercase font-bold text-muted-foreground">Stakeholder Role</label>
        <select
          disabled={disabledFields}
          value={form.stakeholderRole}
          onChange={(e) => setForm(prev => ({ ...prev, stakeholderRole: e.target.value }))}
          className={fieldClass}
        >
          <option value="">Not set</option>
          {Object.entries(STAKEHOLDER_ROLES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="border-t pt-3.5 grid grid-cols-1 gap-3">
        <div>
          <label className="text-3xs uppercase font-bold text-muted-foreground">Associated Lead</label>
          <select
            value={form.leadId}
            onChange={(e) => setForm(prev => ({ ...prev, leadId: e.target.value }))}
            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
          >
            <option value="">— None —</option>
            {leads.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-3xs uppercase font-bold text-muted-foreground">Associated Account</label>
          <select
            value={form.accountId}
            onChange={(e) => setForm(prev => ({ ...prev, accountId: e.target.value }))}
            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
          >
            <option value="">— None —</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-3xs uppercase font-bold text-muted-foreground">Associated Deal</label>
          <select
            value={form.dealId}
            onChange={(e) => setForm(prev => ({ ...prev, dealId: e.target.value }))}
            className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
          >
            <option value="">— None —</option>
            {deals.map(d => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const supabase = createClient()
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
  const [contacts, setContacts] = React.useState<ContactRecord[]>([])
  const [leads, setLeads] = React.useState<Option[]>([])
  const [accounts, setAccounts] = React.useState<Option[]>([])
  const [deals, setDeals] = React.useState<Option[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("All Roles")
  const [error, setError] = React.useState<string | null>(null)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [addForm, setAddForm] = React.useState<ContactForm>(blankForm)
  const [saving, setSaving] = React.useState(false)

  const [editingContact, setEditingContact] = React.useState<ContactRecord | null>(null)
  const [editForm, setEditForm] = React.useState<ContactForm>(blankForm)

  const [deleteTarget, setDeleteTarget] = React.useState<ContactRecord | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const loadAll = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [contactsRes, leadsRes, accountsRes, dealsRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/leads"),
        fetch("/api/accounts"),
        fetch("/api/deals"),
      ])
      if (contactsRes.ok) setContacts(await contactsRes.json())
      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setLeads((data || []).map((l: any) => ({ id: l.id, label: l.opportunityName || l.opportunity_name })))
      }
      if (accountsRes.ok) {
        const data = await accountsRes.json()
        setAccounts((data || []).map((a: any) => ({ id: a.id, label: a.name })))
      }
      if (dealsRes.ok) {
        const data = await dealsRes.json()
        setDeals((data || []).map((d: any) => ({ id: d.id, label: d.opportunity_name })))
      }
    } catch (err) {
      console.error("Error loading contacts workspace:", err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        setCurrentUser({ id: user.id, role: profile?.role || "rep" })
      }
    }
    loadUser()
    loadAll()
  }, [loadAll])

  const isManagerOrAbove = currentUser?.role === "super_admin" || currentUser?.role === "manager"

  const editPermission = React.useCallback((c: ContactRecord): "full" | "associations" | "none" => {
    if (isManagerOrAbove) return "full"
    if (currentUser && c.createdBy && c.createdBy === currentUser.id) return "associations"
    return "none"
  }, [isManagerOrAbove, currentUser])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create contact")
      }
      setIsAddOpen(false)
      setAddForm(blankForm)
      await loadAll(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingContact) return
    setSaving(true)
    setError(null)
    try {
      const permission = editPermission(editingContact)
      const payload = permission === "full"
        ? editForm
        : { leadId: editForm.leadId, accountId: editForm.accountId, dealId: editForm.dealId }

      const res = await fetch(`/api/contacts/${editingContact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update contact")
      }
      setEditingContact(null)
      await loadAll(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/contacts/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete contact")
      }
      setDeleteTarget(null)
      await loadAll(true)
    } catch (err: any) {
      setError(err.message)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const filteredContacts = contacts.filter(c => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || [c.name, c.organization, c.email].some(v => v?.toLowerCase().includes(q))
    const matchesRole = roleFilter === "All Roles" || c.stakeholderRole === roleFilter
    return matchesSearch && matchesRole
  })

  const totalContacts = contacts.length
  const unlinkedCount = contacts.filter(c => !c.leadId && !c.accountId && !c.dealId).length

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
          <div className="flex flex-col gap-4 px-4 pt-6 md:flex-row md:items-center md:justify-between lg:px-6">
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">Relationship Intelligence</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">Contacts</h1>
              <p className="text-sm text-muted-foreground mt-0.5">People behind the pipeline — traceable back to a Lead, Account, or Deal</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 shadow-2xs">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name, org, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-none text-foreground placeholder:text-muted-foreground w-40"
                />
              </div>

              <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 shadow-2xs">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer text-foreground"
                >
                  <option value="All Roles">All Roles</option>
                  {Object.entries(STAKEHOLDER_ROLES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => { setAddForm(blankForm); setIsAddOpen(true) }}
                className="flex items-center gap-1.5 rounded-md bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) transition-colors hover:bg-neutral-800 shadow-sm"
              >
                <Plus className="size-4" />
                Add Contact
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 px-4 py-6 md:grid-cols-2 lg:px-6">
            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Total Contacts</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{totalContacts}</p>
              <p className="mt-1 text-2xs text-muted-foreground">Across all leads, accounts and deals</p>
            </Card>

            <Card className="rounded-lg border bg-card p-4 shadow-2xs">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Not Yet Linked</p>
              <p className={`mt-2 text-3xl font-bold tracking-tight ${unlinkedCount > 0 ? 'text-(--followup-urgent)' : 'text-(--followup-safe)'}`}>
                {unlinkedCount}
              </p>
              <p className="mt-1 text-2xs text-muted-foreground">No Lead, Account, or Deal associated</p>
            </Card>
          </div>

          {error && (
            <div className="mx-4 lg:mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-xs text-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="px-4 lg:px-6">
            {loading ? (
              <div className="flex flex-1 items-center justify-center p-12 text-xs text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Loading contacts...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center border border-dashed rounded-lg bg-card p-12 text-center">
                <ContactIcon className="size-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-foreground">No contacts match your filters</p>
                <p className="text-xs text-muted-foreground mt-1">Contact details can be added even before you know everything about them.</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-card shadow-2xs overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30 font-semibold text-muted-foreground uppercase text-3xs tracking-wider">
                      <th className="p-3">Name</th>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Lead</th>
                      <th className="p-3">Account</th>
                      <th className="p-3">Deal</th>
                      <th className="p-3">Added By</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c) => {
                      const permission = editPermission(c)
                      return (
                        <tr key={c.id} className="border-b last:border-0 bg-card hover:bg-muted/10 transition-colors">
                          <td className="p-3 font-semibold text-foreground max-w-40">
                            {c.name || <span className="text-muted-foreground/50 italic font-normal">Unnamed</span>}
                          </td>
                          <td className="p-3 text-foreground max-w-32">{c.organization || "-"}</td>
                          <td className="p-3 whitespace-nowrap">
                            {c.stakeholderRole ? (
                              <span className="rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 text-3xs font-semibold uppercase px-1.5 py-0.5">
                                {STAKEHOLDER_ROLES[c.stakeholderRole] || c.stakeholderRole}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="p-3 max-w-56">
                            {c.email ? (
                              <Link href={`/email?to=${encodeURIComponent(c.email)}`} className="hover:text-foreground text-muted-foreground flex items-start gap-1 break-words">
                                <Mail className="size-3 shrink-0 mt-0.5" /> {c.email}
                              </Link>
                            ) : "-"}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {c.phone ? (
                              <a href={`tel:${c.phone}`} className="hover:text-foreground text-muted-foreground flex items-center gap-1">
                                <Phone className="size-3 shrink-0" /> {c.phone}
                              </a>
                            ) : "-"}
                          </td>
                          <td className="p-3 max-w-40">
                            {c.lead ? (
                              <Link href={`/leads?lead=${c.lead.id}`} className="text-(--primary) font-semibold hover:underline inline-flex items-center gap-1">
                                <span>{c.lead.opportunityName}</span> <ExternalLink className="size-2.5 shrink-0" />
                              </Link>
                            ) : <span className="text-muted-foreground/50">-</span>}
                          </td>
                          <td className="p-3 max-w-40">
                            {c.account ? (
                              <Link href={`/accounts?account=${c.account.id}`} className="text-(--primary) font-semibold hover:underline inline-flex items-center gap-1">
                                <span>{c.account.name}</span> <ExternalLink className="size-2.5 shrink-0" />
                              </Link>
                            ) : <span className="text-muted-foreground/50">-</span>}
                          </td>
                          <td className="p-3 max-w-40">
                            {c.deal ? (
                              <Link href={`/deals/pipeline?deal=${c.deal.id}`} className="text-(--primary) font-semibold hover:underline inline-flex items-center gap-1">
                                <span>{c.deal.opportunityName}</span> <ExternalLink className="size-2.5 shrink-0" />
                              </Link>
                            ) : <span className="text-muted-foreground/50">-</span>}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-28">{c.createdByName || "-"}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              {permission !== "none" && (
                                <button
                                  onClick={() => { setEditForm(recordToForm(c)); setEditingContact(c) }}
                                  className="flex items-center gap-1 text-3xs font-semibold text-foreground hover:underline"
                                  title={permission === "associations" ? "You can update the Lead/Account/Deal links" : "Edit contact"}
                                >
                                  <Pencil className="size-3" /> Edit
                                </button>
                              )}
                              {isManagerOrAbove && (
                                <button
                                  onClick={() => setDeleteTarget(c)}
                                  className="flex items-center gap-1 text-3xs font-semibold text-(--destructive) hover:underline"
                                >
                                  <Trash2 className="size-3" /> Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* Add Contact Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-2xs flex items-center justify-center z-50 animate-fade-in p-4">
          <Card className="w-full max-w-md bg-card border rounded-lg shadow-xl p-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>

            <h2 className="text-lg font-bold text-foreground">Add Contact</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Every field is optional — fill in what you know now, add the rest later.</p>

            <form onSubmit={handleAdd} className="mt-4 text-xs">
              <ContactFormFields form={addForm} setForm={setAddForm} leads={leads} accounts={accounts} deals={deals} disabledFields={false} />

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="text-xs font-semibold text-muted-foreground hover:underline">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="size-3.5 animate-spin" />} Save Contact
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-2xs flex items-center justify-center z-50 animate-fade-in p-4">
          <Card className="w-full max-w-md bg-card border rounded-lg shadow-xl p-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingContact(null)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>

            <h2 className="text-lg font-bold text-foreground">Edit Contact</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editPermission(editingContact) === "full" ? "Update any detail for this contact." : "Update this contact's Lead, Account, or Deal association."}
            </p>

            <form onSubmit={handleSaveEdit} className="mt-4 text-xs">
              <ContactFormFields
                form={editForm}
                setForm={setEditForm}
                leads={leads}
                accounts={accounts}
                deals={deals}
                disabledFields={editPermission(editingContact) !== "full"}
              />

              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setEditingContact(null)} className="text-xs font-semibold text-muted-foreground hover:underline">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="size-3.5 animate-spin" />} Save Changes
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Contact Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-2xs flex items-center justify-center z-50 animate-fade-in p-4">
          <Card className="w-full max-w-sm bg-card border rounded-lg shadow-xl p-5 relative">
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>

            <h2 className="text-sm font-bold text-foreground">Confirm Delete</h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              This will permanently delete {deleteTarget.name || "this contact"}. This cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-xs font-semibold text-muted-foreground hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-(--destructive) px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="size-3.5 animate-spin" />} Confirm Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </SidebarProvider>
  )
}
