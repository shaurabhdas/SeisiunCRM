"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { Loader2, Bell, CheckCheck } from "lucide-react"

type Notification = {
  id: string
  type: string
  recordType: "lead" | "deal"
  recordId: string
  recordName: string
  message: string
  actorName: string | null
  read: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [markingAll, setMarkingAll] = React.useState(false)
  const [limit, setLimit] = React.useState(50)

  const fetchNotifications = React.useCallback(async (fetchLimit: number) => {
    try {
      const res = await fetch(`/api/notifications?limit=${fetchLimit}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error("Error loading notifications:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchNotifications(limit)
  }, [limit, fetchNotifications])

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      }
    } catch (err) {
      console.error("Error marking all read:", err)
    } finally {
      setMarkingAll(false)
    }
  }

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [n.id] }),
        })
      } catch (err) {
        console.error("Error marking notification read:", err)
      }
    }
    router.push(n.recordType === "lead" ? `/leads?lead=${n.recordId}` : `/deals/pipeline?deal=${n.recordId}`)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#f7f7f2] dark:bg-zinc-950/40">
        <SiteHeader />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-8 px-4 md:px-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Bell className="size-4" />
                  Notifications
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="rounded border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {markingAll ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
                  Mark all as read
                </button>
              )}
            </div>

            <Card className="bg-card border shadow-xs overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-8 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">No notifications yet.</div>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-3 ${!n.read ? 'bg-(--brand-accent-soft)' : ''}`}
                    >
                      <span className={`mt-1.5 size-1.5 rounded-full shrink-0 ${!n.read ? 'bg-(--primary)' : 'bg-transparent'}`} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs text-foreground leading-snug">{n.message}</span>
                        <span className="block text-3xs text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleString()}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {!loading && notifications.length >= limit && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setLimit(prev => prev + 50)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
