"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import { Plus, Users, UserCheck, UserMinus, ShieldAlert, X } from "lucide-react"

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  created_at: string
}

export default function UserManagementPage() {
  const supabase = createClient()
  const [currentUser, setCurrentUser] = React.useState<any>(null)
  const [users, setUsers] = React.useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false)
  const [roleModalOpen, setRoleModalOpen] = React.useState(false)
  const [revokeModalOpen, setRevokeModalOpen] = React.useState(false)
  const [restoreModalOpen, setRestoreModalOpen] = React.useState(false)

  // Selected user for action
  const [selectedUser, setSelectedUser] = React.useState<UserProfile | null>(null)

  // Form states
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteFullName, setInviteFullName] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState("rep")
  const [selectedRole, setSelectedRole] = React.useState("rep")

  const [errorMessage, setErrorMessage] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error("Failed to fetch users", err)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      await fetchUsers()
    }
    init()
  }, [])

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteFullName,
          role: inviteRole,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        setInviteModalOpen(false)
        setInviteEmail("")
        setInviteFullName("")
        setInviteRole("rep")
        await fetchUsers()
      } else {
        setErrorMessage(result.error || "Failed to invite user")
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setErrorMessage("")
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_role",
          role: selectedRole,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        setRoleModalOpen(false)
        setSelectedUser(null)
        await fetchUsers()
      } else {
        setErrorMessage(result.error || "Failed to update role")
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevokeConfirm = async () => {
    if (!selectedUser) return
    setErrorMessage("")
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      })
      const result = await res.json()
      if (res.ok) {
        setRevokeModalOpen(false)
        setSelectedUser(null)
        await fetchUsers()
      } else {
        setErrorMessage(result.error || "Failed to revoke access")
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRestoreConfirm = async () => {
    if (!selectedUser) return
    setErrorMessage("")
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          email: selectedUser.email,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        setRestoreModalOpen(false)
        setSelectedUser(null)
        await fetchUsers()
      } else {
        setErrorMessage(result.error || "Failed to restore access")
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
  }

  // Counts for summary chips
  const totalUsers = users.length
  const pendingUsers = users.filter(u => u.status === "pending").length
  const revokedUsers = users.filter(u => u.status === "revoked").length

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#fafafa]">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <SiteHeader />
          <main className="flex-1 p-6 space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  ADMINISTRATION
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  User Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  Invite team members, assign roles, and manage access.
                </p>
              </div>
              <button
                onClick={() => {
                  setErrorMessage("")
                  setInviteModalOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium transition-colors shadow-sm cursor-pointer self-start md:self-auto"
              >
                <Plus className="size-4" />
                Invite User
              </button>
            </div>

            {/* Summary chips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-4">
                <div className="rounded-lg p-2.5 bg-muted text-muted-foreground">
                  <Users className="size-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium">Total Users</div>
                  <div className="text-2xl font-semibold text-foreground mt-0.5">{totalUsers}</div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-4">
                <div className={`rounded-lg p-2.5 ${pendingUsers > 0 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium">Pending Activation</div>
                  <div className={`text-2xl font-semibold mt-0.5 ${pendingUsers > 0 ? 'text-amber-600 font-bold' : 'text-foreground'}`}>
                    {pendingUsers}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-4">
                <div className={`rounded-lg p-2.5 ${revokedUsers > 0 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
                  <UserMinus className="size-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground font-medium">Revoked</div>
                  <div className={`text-2xl font-semibold mt-0.5 ${revokedUsers > 0 ? 'text-destructive font-bold' : 'text-foreground'}`}>
                    {revokedUsers}
                  </div>
                </div>
              </div>
            </div>

            {/* Users table */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Joined</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          Loading user list...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No users registered.
                        </td>
                      </tr>
                    ) : (
                      users.map((profile) => {
                        const isSelf = currentUser && profile.id === currentUser.id
                        return (
                          <tr key={profile.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-4">
                              <div className="font-medium text-foreground flex items-center gap-1.5">
                                {profile.full_name || "Unassigned"}
                                {isSelf && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {profile.email}
                              </div>
                            </td>
                            <td className="p-4">
                              {profile.role === "super_admin" && (
                                <span className="rounded px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground">
                                  Super Admin
                                </span>
                              )}
                              {profile.role === "manager" && (
                                <span className="rounded px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-800" style={{ color: 'var(--role-decision-maker-text)', backgroundColor: 'var(--role-decision-maker)' }}>
                                  Manager
                                </span>
                              )}
                              {profile.role === "rep" && (
                                <span className="rounded px-2.5 py-1 text-xs font-medium bg-teal-100 text-teal-800" style={{ color: 'var(--role-champion-text)', backgroundColor: 'var(--role-champion)' }}>
                                  Rep
                                </span>
                              )}
                              {profile.role === "pending" && (
                                <span className="rounded px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              {profile.status === "active" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" style={{ color: 'var(--followup-safe)', borderColor: 'var(--followup-safe)' }}>
                                  Active
                                </span>
                              )}
                              {profile.status === "pending" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" style={{ color: 'var(--followup-warning)', borderColor: 'var(--followup-warning)' }}>
                                  Pending
                                </span>
                              )}
                              {profile.status === "revoked" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200" style={{ color: 'var(--destructive)', borderColor: 'var(--destructive)' }}>
                                  Revoked
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-muted-foreground">
                              {formatDate(profile.created_at)}
                            </td>
                            <td className="p-4 text-right">
                              {!isSelf && (
                                <div className="flex justify-end gap-2">
                                  {profile.status === "active" && (profile.role === "manager" || profile.role === "rep") && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedUser(profile)
                                          setSelectedRole(profile.role)
                                          setErrorMessage("")
                                          setRoleModalOpen(true)
                                        }}
                                        className="rounded-md border border-input bg-background hover:bg-muted px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                                      >
                                        Change Role
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedUser(profile)
                                          setErrorMessage("")
                                          setRevokeModalOpen(true)
                                        }}
                                        className="rounded-md bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                                      >
                                        Revoke Access
                                      </button>
                                    </>
                                  )}
                                  {profile.status === "pending" && (
                                    <button
                                      onClick={() => {
                                        setSelectedUser(profile)
                                        setSelectedRole("rep")
                                        setErrorMessage("")
                                        setRoleModalOpen(true)
                                      }}
                                      className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer shadow-sm"
                                    >
                                      Assign Role
                                    </button>
                                  )}
                                  {profile.status === "revoked" && (
                                    <button
                                      onClick={() => {
                                        setSelectedUser(profile)
                                        setErrorMessage("")
                                        setRestoreModalOpen(true)
                                      }}
                                      className="rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      Restore Access
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Invite User Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[440px] rounded-xl border border-border bg-card p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-semibold text-foreground">Invite User</h2>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="rounded-md p-1 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="invite-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </label>
                <input
                  id="invite-name"
                  type="text"
                  placeholder="Avery Jones"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="invite-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address *
                </label>
                <input
                  id="invite-email"
                  type="email"
                  placeholder="avery@pulsecrm.ai"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="invite-role" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role *
                </label>
                <select
                  id="invite-role"
                  required
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="rep">Rep</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              {errorMessage && (
                <div className="text-sm text-destructive font-medium bg-red-50 border border-red-100 rounded-md p-2">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-md border border-input bg-background hover:bg-muted px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Inviting..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Change Role Modal */}
      {roleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[440px] rounded-xl border border-border bg-card p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-semibold text-foreground">
                {selectedUser.status === "pending" ? "Assign Role" : "Change Role"}
              </h2>
              <button
                onClick={() => {
                  setRoleModalOpen(false)
                  setSelectedUser(null)
                }}
                className="rounded-md p-1 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  User Email
                </div>
                <div className="text-sm text-foreground bg-muted/40 p-2.5 rounded-md border border-border">
                  {selectedUser.email}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="role-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Role
                </label>
                <select
                  id="role-select"
                  required
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="rep">Rep</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              {errorMessage && (
                <div className="text-sm text-destructive font-medium bg-red-50 border border-red-100 rounded-md p-2">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRoleModalOpen(false)
                    setSelectedUser(null)
                  }}
                  className="rounded-md border border-input bg-background hover:bg-muted px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : selectedUser.status === "pending" ? "Assign Role" : "Change Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Access Confirmation Modal */}
      {revokeModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[440px] rounded-xl border border-border bg-card p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3 text-destructive">
              <ShieldAlert className="size-5 shrink-0" />
              <h2 className="text-lg font-semibold">
                Revoke access for {selectedUser.full_name || selectedUser.email}?
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This will immediately sign them out and block all future access. Their unfinished leads and deals will be flagged for reassignment.
              </p>

              {errorMessage && (
                <div className="text-sm text-destructive font-medium bg-red-50 border border-red-100 rounded-md p-2">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRevokeModalOpen(false)
                    setSelectedUser(null)
                  }}
                  className="rounded-md border border-input bg-background hover:bg-muted px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevokeConfirm}
                  disabled={isSubmitting}
                  className="rounded-md bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Revoking..." : "Revoke Access"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Access Confirmation Modal */}
      {restoreModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[440px] rounded-xl border border-border bg-card p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3 text-emerald-600">
              <UserCheck className="size-5 shrink-0" />
              <h2 className="text-lg font-semibold">
                Restore access for {selectedUser.full_name || selectedUser.email}?
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This will reactivate their account and send them a new sign-in link via email.
              </p>

              {errorMessage && (
                <div className="text-sm text-destructive font-medium bg-red-50 border border-red-100 rounded-md p-2">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRestoreModalOpen(false)
                    setSelectedUser(null)
                  }}
                  className="rounded-md border border-input bg-background hover:bg-muted px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreConfirm}
                  disabled={isSubmitting}
                  className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Restoring..." : "Restore Access"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  )
}
