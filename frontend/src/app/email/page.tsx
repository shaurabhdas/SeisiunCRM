"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { ComposeTab } from "./compose-tab"
import { SentTab } from "./sent-tab"
import { TemplatesTab } from "./templates-tab"

export type CurrentUser = {
  id: string
  email: string
  fullName: string
  role: string
}

export default function EmailPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null)
  const [outlookConnected, setOutlookConnected] = React.useState(false)
  const [outlookEmail, setOutlookEmail] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState("compose")

  const refreshOutlookStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/email/oauth/status")
      const data = await res.json()
      setOutlookConnected(!!data.connected)
      setOutlookEmail(data.email || null)
    } catch {
      // leave defaults
    }
  }, [])

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single()

        setCurrentUser({
          id: user.id,
          email: user.email!,
          fullName: profile?.full_name || user.email!,
          role: profile?.role || "rep",
        })
      }
      await refreshOutlookStatus()
      setLoading(false)
    }
    load()
  }, [supabase, refreshOutlookStatus])

  if (loading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f7f2] dark:bg-zinc-950/40 text-xs text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin text-(--primary)" />
        Loading Email...
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#f7f7f2] dark:bg-zinc-950/40">
        <SiteHeader />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)} className="w-full">
            <TabsList variant="line">
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="mt-4">
              <React.Suspense fallback={
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin text-(--primary)" />
                  Loading Compose...
                </div>
              }>
                <ComposeTab
                  currentUser={currentUser}
                  outlookConnected={outlookConnected}
                  outlookEmail={outlookEmail}
                  onSent={refreshOutlookStatus}
                />
              </React.Suspense>
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
              <SentTab currentUser={currentUser} />
            </TabsContent>

            <TabsContent value="templates" className="mt-4">
              <TemplatesTab currentUser={currentUser} />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
