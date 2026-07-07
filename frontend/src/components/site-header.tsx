"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const breadcrumbLabels: Record<string, string> = {
  "/dashboard/forecast-pulse": "Forecast Pulse",
  "/dashboard/team-activity": "Team Activity",
  "/leads": "Leads",
  "/accounts": "Accounts",
  "/deals/pipeline": "Deals Pipeline",
  "/deals/at-risk": "Deals At Risk",
  "/settings/users": "User Management",
  "/tasks": "Tasks",
  "/setup": "Setup",
};

export function SiteHeader() {
  const pathname = usePathname()
  const currentLabel = breadcrumbLabels[pathname] || "Forecast Pulse"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center justify-between gap-3 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1 size-8 rounded-md" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 data-vertical:self-auto"
        />
        <nav aria-label="breadcrumb" className="text-sm">
          <ol className="flex items-center gap-1.5 text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">Seisiun CRM</Link>
            </li>
            <li className="text-muted-foreground/50">/</li>
            <li className="font-normal text-foreground">{currentLabel}</li>
          </ol>
        </nav>
      </div>
      
      {pathname === "/dashboard/forecast-pulse" && (
        <div className="hidden items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground md:flex shadow-xs">
          <Sparkles className="size-3.5 text-sky-600 animate-pulse" />
          <span>Forecast refreshed from Supabase CRM activity</span>
        </div>
      )}
    </header>
  )
}
