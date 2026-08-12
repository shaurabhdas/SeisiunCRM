import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Every authenticated user needs access under /settings — /settings/profile
// is where each user manages their own profile, password, and Outlook
// connection. Role-specific gating (e.g. super_admin-only user management)
// belongs in a nested layout scoped to that specific route, not here.
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <>{children}</>
}
