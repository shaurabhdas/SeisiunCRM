"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, AlertCircle, Link2, Unlink, Hash, Lock } from "lucide-react"

type SlackChannel = { id: string; name: string; isPrivate: boolean }

function IntegrationsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [statusLoading, setStatusLoading] = React.useState(true)
  const [connected, setConnected] = React.useState(false)
  const [teamName, setTeamName] = React.useState<string | null>(null)
  const [actionLoading, setActionLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  const [channels, setChannels] = React.useState<SlackChannel[]>([])
  const [channelId, setChannelId] = React.useState("")
  const [channelName, setChannelName] = React.useState("")
  const [notifyNewLead, setNotifyNewLead] = React.useState(true)
  const [notifyDealWon, setNotifyDealWon] = React.useState(true)
  const [notifyDealLost, setNotifyDealLost] = React.useState(false)
  const [settingsLoading, setSettingsLoading] = React.useState(false)
  const [settingsSaving, setSettingsSaving] = React.useState(false)

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/slack/oauth/status")
      const data = await res.json()
      setConnected(!!data.connected)
      setTeamName(data.teamName || null)
    } catch (err) {
      console.error("Error loading Slack status:", err)
    } finally {
      setStatusLoading(false)
    }
  }, [])

  const fetchSettingsAndChannels = React.useCallback(async () => {
    setSettingsLoading(true)
    try {
      const [settingsRes, channelsRes] = await Promise.all([
        fetch("/api/slack/settings"),
        fetch("/api/slack/channels"),
      ])
      const settings = await settingsRes.json()
      setChannelId(settings.channelId || "")
      setChannelName(settings.channelName || "")
      setNotifyNewLead(settings.notifyNewLead ?? true)
      setNotifyDealWon(settings.notifyDealWon ?? true)
      setNotifyDealLost(settings.notifyDealLost ?? false)

      if (channelsRes.ok) setChannels(await channelsRes.json())
    } catch (err) {
      console.error("Error loading Slack settings:", err)
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  React.useEffect(() => {
    if (connected) fetchSettingsAndChannels()
  }, [connected, fetchSettingsAndChannels])

  React.useEffect(() => {
    if (searchParams.get("success") === "slack_connected") {
      setMessage({ type: "success", text: "Slack workspace connected successfully." })
      router.replace("/settings/integrations")
      fetchStatus()
    } else if (searchParams.get("error") === "slack_oauth_failed") {
      setMessage({ type: "error", text: "Failed to connect Slack. Please try again." })
      router.replace("/settings/integrations")
    }
  }, [searchParams, router, fetchStatus])

  const handleConnect = () => {
    window.location.href = "/api/slack/oauth/initiate"
  }

  const handleDisconnect = async () => {
    setActionLoading(true)
    setMessage(null)
    try {
      const res = await fetch("/api/slack/oauth/disconnect", { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to disconnect Slack")
      }
      setConnected(false)
      setTeamName(null)
      setMessage({ type: "success", text: "Slack disconnected." })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/slack/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, channelName, notifyNewLead, notifyDealWon, notifyDealLost }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save Slack settings")
      }
      setMessage({ type: "success", text: "Slack notification settings saved." })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message })
    } finally {
      setSettingsSaving(false)
    }
  }

  if (statusLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f7f2] dark:bg-zinc-950/40 text-xs text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin text-(--primary)" />
        Loading Integrations...
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#f7f7f2] dark:bg-zinc-950/40">
        <SiteHeader />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-8 px-4 md:px-6 space-y-6">

            {/* Slack Connection Card */}
            <Card className="p-6 bg-card border shadow-xs">
              <div className="flex items-center gap-2 mb-6">
                <svg viewBox="0 0 24 24" className="size-5" fill="none">
                  <path d="M9.5 15.5a2.5 2.5 0 1 1-2.5-2.5h2.5v2.5Z" fill="#E01E5A" />
                  <path d="M10.5 15.5a2.5 2.5 0 1 1 5 0v6a2.5 2.5 0 1 1-5 0v-6Z" fill="#E01E5A" />
                  <path d="M8.5 9.5a2.5 2.5 0 1 1 2.5-2.5v2.5H8.5Z" fill="#36C5F0" />
                  <path d="M8.5 10.5a2.5 2.5 0 1 1 0 5h-6a2.5 2.5 0 1 1 0-5h6Z" fill="#36C5F0" />
                  <path d="M14.5 8.5a2.5 2.5 0 1 1 2.5 2.5h-2.5V8.5Z" fill="#2EB67D" />
                  <path d="M13.5 8.5a2.5 2.5 0 1 1-5 0v-6a2.5 2.5 0 1 1 5 0v6Z" fill="#2EB67D" />
                  <path d="M15.5 14.5a2.5 2.5 0 1 1-2.5 2.5v-2.5h2.5Z" fill="#ECB22E" />
                  <path d="M15.5 13.5a2.5 2.5 0 1 1 0-5h6a2.5 2.5 0 1 1 0 5h-6Z" fill="#ECB22E" />
                </svg>
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Slack</h2>
              </div>

              {connected ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Connected</p>
                      <p className="text-3xs text-muted-foreground mt-0.5">{teamName}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={actionLoading}
                    className="rounded border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">Connect the Seisiun Analytics Slack workspace to post CRM activity to a channel.</p>
                  <button
                    type="button"
                    onClick={handleConnect}
                    className="rounded bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 flex items-center gap-1.5 shrink-0"
                  >
                    <Link2 className="size-3.5" />
                    Connect Slack Workspace
                  </button>
                </div>
              )}

              {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-xs mt-4 ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {message.type === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}
            </Card>

            {/* Notification Settings Card */}
            {connected && (
              <Card className="p-6 bg-card border shadow-xs">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-1">Notifications</h2>
                <p className="text-xs text-muted-foreground mb-6">Choose the channel and which CRM events post to it.</p>

                {settingsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading settings...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-3xs uppercase font-bold text-muted-foreground">Channel</label>
                      <select
                        value={channelId}
                        onChange={(e) => {
                          setChannelId(e.target.value)
                          setChannelName(channels.find(c => c.id === e.target.value)?.name || "")
                        }}
                        className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                      >
                        <option value="">Select a channel...</option>
                        {channels.map(c => (
                          <option key={c.id} value={c.id}>{c.isPrivate ? "🔒 " : "# "}{c.name}</option>
                        ))}
                      </select>
                      <p className="text-3xs text-muted-foreground mt-1 flex items-center gap-1">
                        {channelId && channels.find(c => c.id === channelId)?.isPrivate ? (
                          <><Lock className="size-3" /> Private channels need the Seisiun CRM app invited to them (<code>/invite @Seisiun CRM</code>).</>
                        ) : (
                          <><Hash className="size-3" /> Public channels work as soon as they&apos;re selected.</>
                        )}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input type="checkbox" checked={notifyNewLead} onChange={(e) => setNotifyNewLead(e.target.checked)} className="accent-(--primary)" />
                        New lead created
                      </label>
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input type="checkbox" checked={notifyDealWon} onChange={(e) => setNotifyDealWon(e.target.checked)} className="accent-(--primary)" />
                        Deal won
                      </label>
                      <label className="flex items-center gap-2 text-xs text-foreground">
                        <input type="checkbox" checked={notifyDealLost} onChange={(e) => setNotifyDealLost(e.target.checked)} className="accent-(--primary)" />
                        Deal lost
                      </label>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={settingsSaving || !channelId}
                        className="rounded bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {settingsSaving && <Loader2 className="size-3.5 animate-spin" />}
                        Save Settings
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            )}

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function IntegrationsPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#f7f7f2] dark:bg-zinc-950/40 text-xs text-muted-foreground gap-2"><Loader2 className="size-4 animate-spin text-(--primary)" />Loading Integrations...</div>}>
      <IntegrationsPageContent />
    </React.Suspense>
  )
}
