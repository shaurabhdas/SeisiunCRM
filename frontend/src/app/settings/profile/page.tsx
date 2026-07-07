"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Loader2, KeyRound, UserRound, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react"

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = React.useState(true)
  const [profile, setProfile] = React.useState<any>(null)
  const [user, setUser] = React.useState<any>(null)

  // Profile Form State
  const [fullName, setFullName] = React.useState("")
  const [saveLoading, setSaveLoading] = React.useState(false)
  const [profileMessage, setProfileMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Password Form State
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [pwdLoading, setPwdLoading] = React.useState(false)
  const [pwdMessage, setPwdMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Danger Zone State
  const [dangerLoading, setDangerLoading] = React.useState(false)
  const [dangerMessage, setDangerMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fetchProfile = React.useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setProfile(userProfile)
      setFullName(userProfile?.full_name || authUser.user_metadata?.full_name || "")
    } catch (err) {
      console.error("Error loading profile:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  React.useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Handle Save Changes (Profile Info)
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveLoading(true)
    setProfileMessage(null)

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ full_name: fullName })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' })
      // Re-fetch profile to trigger sidebar and state refresh
      await fetchProfile()
      // Dispatch storage event to notify sidebar
      window.dispatchEvent(new Event('storage'))
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message })
    } finally {
      setSaveLoading(false)
    }
  }

  // Handle Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMessage(null)

    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    if (newPassword.length < 6) {
      setPwdMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    setPwdLoading(true)

    try {
      // 1. Verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      })

      if (signInError) {
        throw new Error('Current password verification failed. Please check your password.')
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      setPwdMessage({ type: 'success', text: 'Password updated successfully.' })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setPwdMessage({ type: 'error', text: err.message })
    } finally {
      setPwdLoading(false)
    }
  }

  // Handle Sign Out Everywhere
  const handleSignOutEverywhere = async () => {
    const confirm = window.confirm("Are you sure you want to sign out of all sessions? You will be signed out on all devices immediately.")
    if (!confirm) return

    setDangerLoading(true)
    setDangerMessage(null)

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'sign_out_everywhere' })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign out everywhere')
      }

      // Explicitly sign out client-side to clear tokens
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err: any) {
      setDangerMessage({ type: 'error', text: err.message })
      setDangerLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f7f2] dark:bg-zinc-950/40 text-xs text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin text-(--primary)" />
        Loading Profile Settings...
      </div>
    )
  }

  const initials = (profile?.full_name || user?.email || "")
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U'

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#f7f7f2] dark:bg-zinc-950/40">
        <SiteHeader />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-8 px-4 md:px-6 space-y-6">
            
            {/* Profile Info Card */}
            <Card className="p-6 bg-card border shadow-xs">
              <div className="flex items-center gap-2 mb-6">
                <UserRound className="size-5 text-indigo-500" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Profile Information</h2>
              </div>

              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b">
                <div className="relative group">
                  <div className="size-16 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-bold text-lg flex items-center justify-center shadow-md select-none">
                    {initials}
                  </div>
                </div>

                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <p className="text-base font-semibold text-foreground">{profile?.full_name || "Representative"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <div className="inline-flex items-center gap-1.5 mt-2 rounded-full px-2 py-0.5 text-3xs font-semibold uppercase border bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/50">
                    Role: {profile?.role?.replace('_', ' ') || 'Rep'}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveChanges} className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-3xs uppercase font-bold text-muted-foreground">Full Name</label>
                    <input 
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                    />
                  </div>
                  <div>
                    <label className="text-3xs uppercase font-bold text-muted-foreground">Email Address</label>
                    <input 
                      type="email"
                      readOnly
                      disabled
                      value={user?.email || ""}
                      className="w-full border rounded p-2 mt-1 text-xs text-muted-foreground bg-muted/20 select-none cursor-not-allowed"
                    />
                  </div>
                </div>

                {profileMessage && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
                    profileMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {profileMessage.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    disabled={saveLoading}
                    className="rounded bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saveLoading && <Loader2 className="size-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </Card>

            {/* Change Password Card */}
            <Card className="p-6 bg-card border shadow-xs">
              <div className="flex items-center gap-2 mb-6">
                <KeyRound className="size-5 text-indigo-500" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Change Password</h2>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-3xs uppercase font-bold text-muted-foreground">Current Password</label>
                    <input 
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                    />
                  </div>
                  <div>
                    <label className="text-3xs uppercase font-bold text-muted-foreground">New Password</label>
                    <input 
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                    />
                  </div>
                  <div>
                    <label className="text-3xs uppercase font-bold text-muted-foreground">Confirm New Password</label>
                    <input 
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border rounded p-2 mt-1 text-xs text-foreground bg-card focus:outline-none focus:ring-1 focus:ring-(--primary)"
                    />
                  </div>
                </div>

                {pwdMessage && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
                    pwdMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {pwdMessage.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                    <span>{pwdMessage.text}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" 
                    disabled={pwdLoading}
                    className="rounded bg-(--primary) px-4 py-2 text-xs font-semibold text-(--primary-foreground) hover:bg-neutral-800 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {pwdLoading && <Loader2 className="size-3.5 animate-spin" />}
                    Update Password
                  </button>
                </div>
              </form>
            </Card>

            {/* Danger Zone Card */}
            <Card className="p-6 bg-red-50/5 border border-red-500/20 shadow-xs">
              <div className="flex items-center gap-2 mb-6">
                <ShieldAlert className="size-5 text-red-500" />
                <h2 className="text-sm font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">Danger Zone</h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-t border-red-500/10">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold text-foreground">Sign out of all devices</p>
                  <p className="text-3xs text-muted-foreground mt-0.5">This will invalidate all current web sessions and mobile logins for your account.</p>
                </div>

                <button 
                  type="button"
                  onClick={handleSignOutEverywhere}
                  disabled={dangerLoading}
                  className="rounded bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {dangerLoading && <Loader2 className="size-3.5 animate-spin" />}
                  Sign Out Everywhere
                </button>
              </div>

              {dangerMessage && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-xs mt-4 bg-red-50 text-red-800 border border-red-200">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{dangerMessage.text}</span>
                </div>
              )}
            </Card>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
