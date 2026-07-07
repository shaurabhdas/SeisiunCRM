"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  X,
  Plus,
  MoreVertical,
  CheckSquare,
  Square,
  ChevronDown,
  Briefcase,
  Users,
  Building2,
  Link as LinkIcon,
  AlertTriangle,
  Search,
  Trash2,
  Pencil,
  Check,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams, useRouter } from "next/navigation"
import type { Task } from "@/lib/tasks"

/* ─────────────────────────────────────────────
   Helper: format date "MMM DD"
───────────────────────────────────────────── */
function fmtShort(dateStr: string | null): string {
  if (!dateStr) return "No due date"
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
}
function fmtLong(dateStr: string | null): string {
  if (!dateStr) return "No due date"
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}
function fmtDatetime(dateStr: string | null): string {
  if (!dateStr) return "Not completed"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) +
    " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}
function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === "complete") return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(task.due_date + "T00:00:00") < today
}
function isDueToday(task: Task): boolean {
  if (!task.due_date || task.status === "complete") return false
  const today = new Date().toISOString().split("T")[0]
  return task.due_date === today
}
function startOfWeek(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setDate(diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

/* ─────────────────────────────────────────────
   Priority badge
───────────────────────────────────────────── */
function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "bg-[var(--followup-critical)] text-white",
    high: "bg-[var(--followup-urgent)] text-white",
    medium: "bg-[var(--followup-warning)] text-gray-900",
    low: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${styles[priority] ?? styles.medium}`}>
      {priority}
    </span>
  )
}

/* ─────────────────────────────────────────────
   Status badge
───────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-[#f5f5f5] text-[#404040]",
    in_progress: "bg-[var(--stage-outreach-bg)] text-[var(--stage-outreach-text)]",
    complete: "bg-[var(--followup-safe)] text-white",
  }
  const labels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    complete: "Complete",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] ?? styles.open}`}>
      {labels[status] ?? status}
    </span>
  )
}

/* ─────────────────────────────────────────────
   Stat Chip
───────────────────────────────────────────── */
function StatChip({ label, count, color }: { label: string; count: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 shadow-sm">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className="text-base font-bold"
        style={color && count > 0 ? { color } : undefined}
      >
        {count}
      </span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main page content (needs Suspense for useSearchParams)
───────────────────────────────────────────── */
function TasksPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTaskId = searchParams.get("task")
  const supabase = createClient()

  const [userProfile, setUserProfile] = React.useState<any>(null)
  const [activeReps, setActiveReps] = React.useState<any[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = React.useState<string>("all")

  // Selected task (Zone C)
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(urlTaskId)

  // Modals
  const [newTaskOpen, setNewTaskOpen] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Zone C editing
  const [isEditing, setIsEditing] = React.useState(false)
  const [editForm, setEditForm] = React.useState<Partial<Task>>({})

  // More menu
  const [showMoreMenu, setShowMoreMenu] = React.useState(false)
  const moreMenuRef = React.useRef<HTMLDivElement>(null)

  // Link record modal
  const [linkRecordOpen, setLinkRecordOpen] = React.useState(false)
  const [linkTab, setLinkTab] = React.useState<"lead" | "deal" | "account">("lead")
  const [linkQuery, setLinkQuery] = React.useState("")
  const [linkResults, setLinkResults] = React.useState<any[]>([])

  // New task form
  const emptyNewTask = {
    title: "",
    description: "",
    priority: "medium" as const,
    due_date: "",
    assigned_to: "",
    assigned_to_name: "",
    lead_id: null as string | null,
    deal_id: null as string | null,
    account_id: null as string | null,
    linked_record_name: "",
    linked_record_type: "" as "" | "lead" | "deal" | "account",
  }
  const [newTaskForm, setNewTaskForm] = React.useState(emptyNewTask)
  const [newTaskError, setNewTaskError] = React.useState("")
  const [newTaskSaving, setNewTaskSaving] = React.useState(false)
  const [newLinkTab, setNewLinkTab] = React.useState<"lead" | "deal" | "account">("lead")
  const [newLinkQuery, setNewLinkQuery] = React.useState("")
  const [newLinkResults, setNewLinkResults] = React.useState<any[]>([])

  /* ── Load user profile ── */
  React.useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single()
      setUserProfile(profile)

      // Set role-based defaults
      if (profile?.role === "rep") {
        setStatusFilter("open")
        setAssigneeFilter(user.id)
      }

      // Load active reps for manager/admin
      if (profile?.role !== "rep") {
        const { data: reps } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .eq("status", "active")
          .order("full_name")
        setActiveReps(reps || [])
      }
    }
    load()
  }, [])

  /* ── Load tasks ── */
  const fetchTasks = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/tasks")
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  /* ── Sync URL ↔ selectedTaskId ── */
  React.useEffect(() => {
    if (urlTaskId && urlTaskId !== selectedTaskId) setSelectedTaskId(urlTaskId)
  }, [urlTaskId])

  const openTask = (id: string) => {
    setSelectedTaskId(id)
    setIsEditing(false)
    setShowMoreMenu(false)
    router.replace(`/tasks?task=${id}`)
  }

  const closePanel = () => {
    setSelectedTaskId(null)
    setIsEditing(false)
    setShowMoreMenu(false)
    router.replace("/tasks")
  }

  /* ── Close more menu on outside click ── */
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  /* ── Filtered + sorted tasks ── */
  const filteredTasks = React.useMemo(() => {
    let list = [...tasks]

    if (statusFilter !== "all") list = list.filter(t => t.status === statusFilter)
    if (assigneeFilter !== "all") list = list.filter(t => t.assigned_to === assigneeFilter)

    // Sort: overdue non-complete first, then by due_date asc, priority desc, complete last
    const priorityRank: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
    list.sort((a, b) => {
      const aComplete = a.status === "complete"
      const bComplete = b.status === "complete"
      if (aComplete !== bComplete) return aComplete ? 1 : -1

      const aOverdue = isOverdue(a)
      const bOverdue = isOverdue(b)
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

      if (a.due_date && b.due_date) {
        const dateDiff = a.due_date.localeCompare(b.due_date)
        if (dateDiff !== 0) return dateDiff
      } else if (a.due_date) return -1
      else if (b.due_date) return 1

      return (priorityRank[b.priority] ?? 2) - (priorityRank[a.priority] ?? 2)
    })

    return list
  }, [tasks, statusFilter, assigneeFilter])

  /* ── Stat chip counts ── */
  const baseList = React.useMemo(() => {
    if (userProfile?.role === "rep") return tasks.filter(t => t.assigned_to === userProfile?.id)
    return tasks
  }, [tasks, userProfile])

  const statOpen = baseList.filter(t => t.status === "open").length
  const statInProgress = baseList.filter(t => t.status === "in_progress").length
  const statOverdue = baseList.filter(t => isOverdue(t)).length
  const statCompletedWeek = baseList.filter(t => {
    if (t.status !== "complete" || !t.completed_at) return false
    return new Date(t.completed_at) >= startOfWeek()
  }).length

  /* ── Selected task ── */
  const selectedTask = tasks.find(t => t.id === selectedTaskId) ?? null

  /* ── Update task status ── */
  const updateTaskStatus = async (id: string, status: "open" | "in_progress" | "complete") => {
    const payload: any = { status }
    if (status === "complete") payload.completed_at = new Date().toISOString()
    if (status !== "complete") payload.completed_at = null
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const updated: Task = await res.json()
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    }
  }

  /* ── Quick complete toggle ── */
  const toggleComplete = async (task: Task) => {
    const newStatus = task.status === "complete" ? "open" : "complete"
    await updateTaskStatus(task.id, newStatus)
  }

  /* ── Delete task ── */
  const doDelete = async () => {
    if (!deleteTargetId) return
    setIsDeleting(true)
    await fetch(`/api/tasks/${deleteTargetId}`, { method: "DELETE" })
    setTasks(prev => prev.filter(t => t.id !== deleteTargetId))
    setDeleteConfirmOpen(false)
    setDeleteTargetId(null)
    if (selectedTaskId === deleteTargetId) closePanel()
    setIsDeleting(false)
  }

  /* ── Save new task ── */
  const saveNewTask = async () => {
    setNewTaskError("")
    if (!newTaskForm.title.trim()) { setNewTaskError("Title is required."); return }
    const isRepRole = userProfile?.role === "rep"
    const body: any = {
      title: newTaskForm.title.trim(),
      description: newTaskForm.description || null,
      priority: newTaskForm.priority,
      due_date: newTaskForm.due_date || null,
      lead_id: newTaskForm.lead_id || null,
      deal_id: newTaskForm.deal_id || null,
      account_id: newTaskForm.account_id || null,
    }
    if (isRepRole) {
      body.assigned_to = userProfile.id
      body.assigned_to_name = userProfile.full_name
    } else {
      if (!newTaskForm.assigned_to) { setNewTaskError("Please select an assignee."); return }
      body.assigned_to = newTaskForm.assigned_to
      body.assigned_to_name = newTaskForm.assigned_to_name
    }
    setNewTaskSaving(true)
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setNewTaskError(data.error || "Failed to create task."); setNewTaskSaving(false); return }
    setTasks(prev => [data, ...prev])
    setNewTaskForm(emptyNewTask)
    setNewTaskOpen(false)
    setNewTaskSaving(false)
  }

  /* ── Save edited task ── */
  const saveEdit = async () => {
    if (!selectedTask) return
    const res = await fetch(`/api/tasks/${selectedTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
      setIsEditing(false)
    }
  }

  /* ── New task link search ── */
  React.useEffect(() => {
    if (!newTaskOpen) return
    if (!newLinkQuery.trim()) { setNewLinkResults([]); return }
    const search = async () => {
      if (newLinkTab === "lead") {
        const { data } = await supabase.from("leads").select("id, opportunity_name, stage").ilike("opportunity_name", `%${newLinkQuery}%`).limit(10)
        setNewLinkResults(data || [])
      } else if (newLinkTab === "deal") {
        const { data } = await supabase.from("deals").select("id, opportunity_name, stage, deal_type").ilike("opportunity_name", `%${newLinkQuery}%`).limit(10)
        setNewLinkResults(data || [])
      } else {
        const { data } = await supabase.from("accounts").select("id, name").ilike("name", `%${newLinkQuery}%`).limit(10)
        setNewLinkResults(data || [])
      }
    }
    search()
  }, [newLinkQuery, newLinkTab, newTaskOpen])

  /* ── Zone C link search ── */
  React.useEffect(() => {
    if (!linkRecordOpen) return
    if (!linkQuery.trim()) { setLinkResults([]); return }
    const search = async () => {
      if (linkTab === "lead") {
        const { data } = await supabase.from("leads").select("id, opportunity_name, stage").ilike("opportunity_name", `%${linkQuery}%`).limit(10)
        setLinkResults(data || [])
      } else if (linkTab === "deal") {
        const { data } = await supabase.from("deals").select("id, opportunity_name, stage, deal_type").ilike("opportunity_name", `%${linkQuery}%`).limit(10)
        setLinkResults(data || [])
      } else {
        const { data } = await supabase.from("accounts").select("id, name").ilike("name", `%${linkQuery}%`).limit(10)
        setLinkResults(data || [])
      }
    }
    search()
  }, [linkQuery, linkTab, linkRecordOpen])

  const isManagerOrAdmin = userProfile?.role === "manager" || userProfile?.role === "super_admin"

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-col h-[calc(100vh-var(--header-height))] overflow-hidden">

          {/* ── Zone A: Page Header ── */}
          <div className="flex-none border-b border-border bg-background px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Task Management</p>
                <h1 className="mt-0.5 text-2xl font-bold text-foreground">Tasks</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {isManagerOrAdmin ? "All team tasks and action items" : "Your assigned tasks and action items"}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Status filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="appearance-none rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="complete">Complete</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                </div>

                {/* Assigned To filter – manager/admin only */}
                {isManagerOrAdmin && (
                  <div className="relative">
                    <select
                      value={assigneeFilter}
                      onChange={e => setAssigneeFilter(e.target.value)}
                      className="appearance-none rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="all">All Reps</option>
                      {activeReps.map(rep => (
                        <option key={rep.id} value={rep.id}>{rep.full_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  </div>
                )}

                {/* New Task button */}
                <button
                  onClick={() => { setNewTaskForm(emptyNewTask); setNewTaskError(""); setNewTaskOpen(true) }}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus className="size-4" />
                  New Task
                </button>
              </div>
            </div>

            {/* Stat chips */}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <StatChip label="Open Tasks" count={statOpen} color={statOpen > 0 ? "var(--followup-warning)" : undefined} />
              <StatChip label="In Progress" count={statInProgress} />
              <StatChip label="Overdue" count={statOverdue} color={statOverdue > 0 ? "var(--followup-critical)" : undefined} />
              <StatChip label="Completed This Week" count={statCompletedWeek} color={statCompletedWeek > 0 ? "var(--followup-safe)" : undefined} />
            </div>
          </div>

          {/* ── Zones B + C ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── Zone B: Task Table ── */}
            <div
              className="flex-1 overflow-y-auto transition-all duration-300"
              style={{ width: selectedTaskId ? "65%" : "100%" }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading tasks…</div>
              ) : filteredTasks.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-60 gap-3">
                  <p className="text-muted-foreground text-sm">No tasks match your filters.</p>
                  <button
                    onClick={() => { setStatusFilter("all"); setAssigneeFilter("all") }}
                    className="text-xs text-primary underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                  <button
                    onClick={() => { setNewTaskForm(emptyNewTask); setNewTaskOpen(true) }}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors cursor-pointer mt-1"
                  >
                    <Plus className="size-4" />
                    Create your first task
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 text-left font-semibold">Task</th>
                      <th className="px-4 py-3 text-left font-semibold">Assigned To</th>
                      <th className="px-4 py-3 text-left font-semibold">Priority</th>
                      <th className="px-4 py-3 text-left font-semibold">Due Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(task => {
                      const overdue = isOverdue(task)
                      const complete = task.status === "complete"
                      const selected = task.id === selectedTaskId
                      const dueToday = isDueToday(task)

                      return (
                        <tr
                          key={task.id}
                          onClick={() => openTask(task.id)}
                          className={`border-b border-border cursor-pointer transition-colors hover:bg-[var(--secondary)] ${selected ? "bg-[var(--secondary)]" : "bg-background"} ${complete ? "opacity-50" : ""}`}
                          style={selected
                            ? { borderLeft: "3px solid #0d9488" }
                            : overdue
                            ? { borderLeft: "3px solid var(--followup-critical)" }
                            : { borderLeft: "3px solid transparent" }
                          }
                        >
                          {/* Task title + linked record */}
                          <td className="px-4 py-3 max-w-[240px]">
                            <div className={`font-medium text-foreground leading-snug ${complete ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </div>
                            {task.lead && (
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                <Users className="size-3" />
                                <span className="truncate">{(task.lead as any).opportunity_name}</span>
                              </div>
                            )}
                            {task.deal && (
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                <Briefcase className="size-3" />
                                <span className="truncate">{(task.deal as any).opportunity_name}</span>
                              </div>
                            )}
                            {task.account && (
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                <Building2 className="size-3" />
                                <span className="truncate">{(task.account as any).name}</span>
                              </div>
                            )}
                          </td>

                          {/* Assigned To */}
                          <td className="px-4 py-3 text-sm">
                            {task.assigned_to_name ?? <span className="text-muted-foreground">Unassigned</span>}
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-3">
                            <PriorityBadge priority={task.priority} />
                          </td>

                          {/* Due Date */}
                          <td className="px-4 py-3">
                            {task.due_date ? (
                              <span
                                className={`font-medium ${overdue ? "text-[var(--followup-critical)] font-bold" : dueToday ? "text-[var(--followup-warning)]" : "text-foreground"}`}
                              >
                                {fmtShort(task.due_date)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">No due date</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge status={task.status} />
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick complete */}
                              <button
                                onClick={() => toggleComplete(task)}
                                title={complete ? "Reopen task" : "Mark complete"}
                                className="rounded p-1 hover:bg-muted transition-colors cursor-pointer"
                              >
                                {complete ? (
                                  <CheckSquare className="size-4 text-[var(--followup-safe)]" />
                                ) : (
                                  <Square className="size-4 text-muted-foreground" />
                                )}
                              </button>

                              {/* Three-dot menu */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openTask(task.id)
                                    setShowMoreMenu(true)
                                  }}
                                  className="rounded p-1 hover:bg-muted transition-colors cursor-pointer"
                                >
                                  <MoreVertical className="size-4 text-muted-foreground" />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── Zone C: Task Detail Panel ── */}
            {selectedTaskId && selectedTask && (
              <div
                className="flex-none border-l border-border bg-card overflow-y-auto transition-all duration-300"
                style={{ width: "35%" }}
              >
                {/* Panel header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Task Detail</span>
                  <div className="flex items-center gap-1">
                    {/* Three dot menu */}
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        onClick={() => setShowMoreMenu(v => !v)}
                        className="rounded p-1.5 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-border bg-card shadow-lg py-1">
                          <button
                            onClick={() => { setEditForm({ ...selectedTask }); setIsEditing(true); setShowMoreMenu(false) }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                          >
                            <Pencil className="size-3.5" /> Edit Task
                          </button>
                          <button
                            onClick={() => { setDeleteTargetId(selectedTask.id); setDeleteConfirmOpen(true); setShowMoreMenu(false) }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" /> Delete Task
                          </button>
                        </div>
                      )}
                    </div>
                    <button onClick={closePanel} className="rounded p-1.5 hover:bg-muted transition-colors cursor-pointer">
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-6">
                  {/* ── Section 1: Task Header ── */}
                  <div className="space-y-3">
                    {isEditing ? (
                      <input
                        value={editForm.title ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full text-xl font-bold bg-transparent border-b border-border focus:outline-none focus:border-primary pb-1"
                      />
                    ) : (
                      <h2 className="text-xl font-bold text-foreground leading-snug">{selectedTask.title}</h2>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {isEditing ? (
                        <>
                          <select
                            value={editForm.priority ?? "medium"}
                            onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as any }))}
                            className="text-xs rounded border border-input px-2 py-1 focus:outline-none"
                          >
                            {["low", "medium", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <select
                            value={editForm.status ?? "open"}
                            onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))}
                            className="text-xs rounded border border-input px-2 py-1 focus:outline-none"
                          >
                            {["open", "in_progress", "complete"].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </>
                      ) : (
                        <>
                          <PriorityBadge priority={selectedTask.priority} />
                          <StatusBadge status={selectedTask.status} />
                        </>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedTask.status === "open" && (
                          <button
                            onClick={() => updateTaskStatus(selectedTask.id, "in_progress")}
                            className="rounded-md bg-[var(--stage-outreach-bg)] text-[var(--stage-outreach-text)] px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Start Working
                          </button>
                        )}
                        {selectedTask.status === "in_progress" && (
                          <button
                            onClick={() => updateTaskStatus(selectedTask.id, "complete")}
                            className="rounded-md bg-[var(--followup-safe)] text-white px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Mark Complete
                          </button>
                        )}
                        {selectedTask.status === "complete" && (
                          <button
                            onClick={() => updateTaskStatus(selectedTask.id, "open")}
                            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          onClick={() => { setDeleteTargetId(selectedTask.id); setDeleteConfirmOpen(true) }}
                          className="text-sm text-destructive hover:underline cursor-pointer"
                        >
                          Delete Task
                        </button>
                      </div>
                    )}

                    {/* Edit save/cancel */}
                    {isEditing && (
                      <div className="flex items-center gap-2">
                        <button onClick={saveEdit} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 cursor-pointer">Save</button>
                        <button onClick={() => setIsEditing(false)} className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted cursor-pointer">Cancel</button>
                      </div>
                    )}
                  </div>

                  {/* ── Section 2: Details ── */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Details</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Assigned To</p>
                        {isEditing ? (
                          <select
                            value={editForm.assigned_to ?? ""}
                            onChange={e => {
                              const rep = activeReps.find(r => r.id === e.target.value)
                              setEditForm(f => ({ ...f, assigned_to: e.target.value, assigned_to_name: rep?.full_name ?? f.assigned_to_name }))
                            }}
                            className="w-full text-sm rounded border border-input px-2 py-1 focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {activeReps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                          </select>
                        ) : (
                          <p className="font-medium">{selectedTask.assigned_to_name ?? <span className="text-muted-foreground">Unassigned</span>}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Created By</p>
                        <p className="font-medium">{selectedTask.created_by_name ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Priority</p>
                        <PriorityBadge priority={selectedTask.priority} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                        <StatusBadge status={selectedTask.status} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
                        {isEditing ? (
                          <input
                            type="date"
                            value={editForm.due_date ?? ""}
                            onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                            className="w-full text-sm rounded border border-input px-2 py-1 focus:outline-none"
                          />
                        ) : (
                          <p className={`font-medium ${isOverdue(selectedTask) ? "text-[var(--followup-critical)]" : ""}`}>
                            {fmtLong(selectedTask.due_date)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                        <p className="font-medium">{fmtLong(selectedTask.created_at)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-0.5">Completed At</p>
                        <p className="font-medium">{fmtDatetime(selectedTask.completed_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 3: Description ── */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Description</h3>
                    {isEditing ? (
                      <textarea
                        value={editForm.description ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        rows={4}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        placeholder="Enter description…"
                      />
                    ) : selectedTask.description ? (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No description provided.</p>
                    )}
                  </div>

                  {/* ── Section 4: Linked Record ── */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Linked Record</h3>
                    {selectedTask.lead_id && selectedTask.lead ? (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{(selectedTask.lead as any).opportunity_name}</p>
                            <StatusBadge status={(selectedTask.lead as any).stage} />
                          </div>
                        </div>
                        <a
                          href={`/leads?lead=${selectedTask.lead_id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View Lead →
                        </a>
                      </div>
                    ) : selectedTask.deal_id && selectedTask.deal ? (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{(selectedTask.deal as any).opportunity_name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-muted-foreground">{(selectedTask.deal as any).deal_type}</span>
                              <StatusBadge status={(selectedTask.deal as any).stage} />
                            </div>
                          </div>
                        </div>
                        <a
                          href={`/deals/pipeline?deal=${selectedTask.deal_id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View Deal →
                        </a>
                      </div>
                    ) : selectedTask.account_id && selectedTask.account ? (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{(selectedTask.account as any).name}</p>
                        </div>
                        <a
                          href={`/accounts?account=${selectedTask.account_id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View Account →
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">No linked record.</p>
                        <button
                          onClick={() => { setLinkQuery(""); setLinkResults([]); setLinkRecordOpen(true) }}
                          className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-md px-2 py-1 hover:bg-primary/5 transition-colors cursor-pointer"
                        >
                          <Plus className="size-3" /> Link to Record
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* ══════════════════════════════════════════
          New Task Modal
      ══════════════════════════════════════════ */}
      {newTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">New Task</h2>
              <button onClick={() => setNewTaskOpen(false)} className="rounded p-1 hover:bg-muted cursor-pointer"><X className="size-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title <span className="text-destructive">*</span></label>
                <input
                  value={newTaskForm.title}
                  onChange={e => setNewTaskForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Task title…"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</label>
                <textarea
                  value={newTaskForm.description}
                  onChange={e => setNewTaskForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional description…"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
              {/* Priority + Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority <span className="text-destructive">*</span></label>
                  <select
                    value={newTaskForm.priority}
                    onChange={e => setNewTaskForm(f => ({ ...f, priority: e.target.value as any }))}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</label>
                  <input
                    type="date"
                    value={newTaskForm.due_date}
                    onChange={e => setNewTaskForm(f => ({ ...f, due_date: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">Recommended for tracking</p>
                </div>
              </div>
              {/* Assigned To */}
              {isManagerOrAdmin ? (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned To <span className="text-destructive">*</span></label>
                  <select
                    value={newTaskForm.assigned_to}
                    onChange={e => {
                      const rep = activeReps.find(r => r.id === e.target.value)
                      setNewTaskForm(f => ({ ...f, assigned_to: e.target.value, assigned_to_name: rep?.full_name ?? "" }))
                    }}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Select assignee…</option>
                    {activeReps.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                  </select>
                </div>
              ) : null}

              {/* Link to Record */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Link to Record <span className="text-muted-foreground font-normal normal-case">(optional)</span></label>

                {/* Show selected record */}
                {newTaskForm.linked_record_type && (
                  <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-medium">{newTaskForm.linked_record_name}</span>
                    <button
                      onClick={() => setNewTaskForm(f => ({ ...f, lead_id: null, deal_id: null, account_id: null, linked_record_name: "", linked_record_type: "" }))}
                      className="ml-2 text-muted-foreground hover:text-destructive cursor-pointer"
                    ><X className="size-3.5" /></button>
                  </div>
                )}

                {!newTaskForm.linked_record_type && (
                  <div className="mt-2 border border-border rounded-lg overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-border">
                      {(["lead", "deal", "account"] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => { setNewLinkTab(tab); setNewLinkQuery(""); setNewLinkResults([]) }}
                          className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors cursor-pointer ${newLinkTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <input
                          value={newLinkQuery}
                          onChange={e => setNewLinkQuery(e.target.value)}
                          placeholder={`Search ${newLinkTab}s…`}
                          className="w-full rounded border border-input bg-background pl-7 pr-3 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                      {newLinkResults.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 max-h-36 overflow-y-auto">
                          {newLinkResults.map((r: any) => (
                            <li key={r.id}>
                              <button
                                onClick={() => {
                                  setNewTaskForm(f => ({
                                    ...f,
                                    lead_id: newLinkTab === "lead" ? r.id : null,
                                    deal_id: newLinkTab === "deal" ? r.id : null,
                                    account_id: newLinkTab === "account" ? r.id : null,
                                    linked_record_name: r.opportunity_name ?? r.name,
                                    linked_record_type: newLinkTab,
                                  }))
                                  setNewLinkQuery("")
                                  setNewLinkResults([])
                                }}
                                className="w-full text-left rounded px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                              >
                                {r.opportunity_name ?? r.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {newTaskError && <p className="text-sm text-destructive">{newTaskError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <button onClick={() => setNewTaskOpen(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted cursor-pointer">Cancel</button>
              <button
                onClick={saveNewTask}
                disabled={newTaskSaving}
                className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {newTaskSaving ? "Saving…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Delete Confirmation Modal
      ══════════════════════════════════════════ */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              <h2 className="text-base font-semibold">Delete this task?</h2>
            </div>
            <p className="text-sm text-muted-foreground">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirmOpen(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted cursor-pointer">Cancel</button>
              <button
                onClick={doDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Link to Record Modal (Zone C)
      ══════════════════════════════════════════ */}
      {linkRecordOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Link to Record</h2>
              <button onClick={() => setLinkRecordOpen(false)} className="rounded p-1 hover:bg-muted cursor-pointer"><X className="size-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {/* Tabs */}
              <div className="flex border border-border rounded-lg overflow-hidden">
                {(["lead", "deal", "account"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setLinkTab(tab); setLinkQuery(""); setLinkResults([]) }}
                    className={`flex-1 py-2 text-xs font-semibold capitalize transition-colors cursor-pointer ${linkTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  value={linkQuery}
                  onChange={e => setLinkQuery(e.target.value)}
                  placeholder={`Search ${linkTab}s…`}
                  className="w-full rounded border border-input bg-background pl-7 pr-3 py-2 text-sm focus:outline-none"
                />
              </div>
              {linkResults.length > 0 && (
                <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                  {linkResults.map((r: any) => (
                    <li key={r.id}>
                      <button
                        onClick={async () => {
                          const patch: any = {}
                          if (linkTab === "lead") patch.lead_id = r.id
                          else if (linkTab === "deal") patch.deal_id = r.id
                          else patch.account_id = r.id
                          const res = await fetch(`/api/tasks/${selectedTask.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(patch),
                          })
                          if (res.ok) {
                            const updated = await res.json()
                            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                          }
                          setLinkRecordOpen(false)
                        }}
                        className="w-full text-left rounded px-3 py-2 text-sm hover:bg-muted cursor-pointer"
                      >
                        {r.opportunity_name ?? r.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </SidebarProvider>
  )
}

export default function TasksPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center h-screen text-muted-foreground text-sm">Loading…</div>}>
      <TasksPageContent />
    </React.Suspense>
  )
}
