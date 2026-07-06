"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { signOut } from "@/app/login/actions"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CircleGauge,
  ChevronsUpDown,
  Sparkles,
  UsersRound,
  Contact,
  Building2,
  Handshake,
  ListChecks,
  Settings,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Activity,
  ClipboardList,
  BriefcaseBusiness,
  Ellipsis,
  LogOut,
  User,
  CreditCard,
  Bell,
  LayoutDashboard,
} from "lucide-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = React.useState<any>(null)
  const [user, setUser] = React.useState<any>(null)

  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data) {
          setProfile(data)
        }
      }
    }
    fetchUser()
  }, [])

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"
  const displayEmail = profile?.email || user?.email || ""
  const displayInitials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
  const displayAvatar = profile?.avatar_url || ""

  const [openItems, setOpenItems] = React.useState<Record<string, boolean>>({
    Dashboard: true,
    Deals: true,
  })

  const toggleItem = (title: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const crmMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      collapsible: true,
      subItems: [
        { name: "Forecast pulse", url: "/dashboard/forecast-pulse" },
        { name: "Team Activity", url: "/dashboard/team-activity" }
      ],
    },
    {
      title: "Leads",
      icon: UsersRound,
      collapsible: false,
      url: "/leads",
    },
    {
      title: "Contacts",
      icon: Contact,
      collapsible: true,
      subItems: [
        { name: "All Contacts", url: "#" },
        { name: "Decision Makers", url: "#" },
        { name: "Champions", url: "#" },
        { name: "Purchase Owner", url: "#" }
      ],
    },
    {
      title: "Accounts",
      icon: Building2,
      collapsible: false,
      url: "/accounts",
    },
    {
      title: "Deals",
      icon: Handshake,
      collapsible: true,
      subItems: [
        { name: "Pipeline", url: "/deals/pipeline" },
        { name: "At risk", url: "/deals/at-risk" }
      ],
    },
    {
      title: "Tasks",
      icon: ListChecks,
      collapsible: true,
      subItems: [
        { name: "Due Today", url: "#" },
        { name: "Overdue", url: "#" },
        { name: "Closing this month", url: "#" }
      ],
    },
    {
      title: "Settings",
      icon: Settings,
      collapsible: true,
      subItems: profile?.role === 'super_admin'
        ? [{ name: "User Management", url: "/settings/users" }]
        : [{ name: "Profile", url: "/settings/profile" }],
    },
  ]

  const focusViews = [
    { name: "Closing this month", icon: TrendingUp },
    { name: "Stale opportunities", icon: Activity },
    { name: "Copilot review queue", icon: Sparkles },
    { name: "Manager task board", icon: ClipboardList },
    { name: "Expansion pipeline", icon: BriefcaseBusiness },
    { name: "More", icon: Ellipsis },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/40 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <CircleGauge className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-foreground">Seisiun CRM</span>
                <span className="truncate text-xs text-muted-foreground">Revenue team</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/75" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">CRM</SidebarGroupLabel>

          <SidebarMenu className="mt-1.5 space-y-0.5">
            {crmMenuItems.map((item) => {
              const Icon = item.icon
              const isOpen = openItems[item.title] ?? false
              const hasSubItems = item.subItems && item.subItems.length > 0

              return (
                <SidebarMenuItem key={item.title}>
                  {item.collapsible ? (
                    <div className="flex flex-col w-full">
                      {(() => {
                        const href = item.title === "Dashboard" 
                          ? "/dashboard" 
                          : item.title === "Deals" 
                          ? "/deals/pipeline" 
                          : item.title === "Settings"
                          ? (profile?.role === 'super_admin' ? "/settings/users" : "/settings/profile")
                          : undefined
                        const content = (
                          <>
                            <Icon className="size-4 shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            {isOpen ? (
                              <ChevronDown className="size-4 text-muted-foreground/75 shrink-0" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground/75 shrink-0" />
                            )}
                          </>
                        )
                        const className = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        
                        if (href) {
                          return (
                            <Link
                              href={href}
                              onClick={() => toggleItem(item.title)}
                              className={className}
                            >
                              {content}
                            </Link>
                          )
                        }

                        return (
                          <button
                            onClick={() => toggleItem(item.title)}
                            className={className}
                          >
                            {content}
                          </button>
                        )
                      })()}
                      {isOpen && hasSubItems && (
                        <SidebarMenuSub className="mx-2 mt-0.5 border-l border-sidebar-border px-2.5 py-0.5">
                          {item.subItems!.map((sub) => (
                            <SidebarMenuSubItem key={sub.name}>
                              <SidebarMenuSubButton render={<Link href={sub.url} />}>
                                {sub.name}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </div>
                  ) : (
                    <SidebarMenuButton tooltip={item.title} render={<Link href={item.url || "#"} />}>
                      <Icon className="size-4 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-4 py-0">
          <SidebarGroupLabel className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Focus Views</SidebarGroupLabel>
          <SidebarMenu className="mt-1.5 space-y-0.5">
            {focusViews.map((item) => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton tooltip={item.name} render={<a href="#" />}>
                    <Icon className="size-4 shrink-0" />
                    <span>{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton size="lg" className="w-full hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent">
                    <Avatar className="size-8 rounded-full">
                      <AvatarImage src={displayAvatar} alt={displayName} />
                      <AvatarFallback className="rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-xs">{displayInitials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium text-foreground">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/75" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent className="w-56" align="start" side="top" sideOffset={8}>
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="size-8">
                    <AvatarImage src={displayAvatar} alt={displayName} />
                    <AvatarFallback className="rounded-full bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-xs">{displayInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5 text-left text-sm">
                    <span className="font-medium">{displayName}</span>
                    <span className="text-xs text-muted-foreground">{displayEmail}</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="size-4 mr-2" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="size-4 mr-2" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="size-4 mr-2" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="size-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
