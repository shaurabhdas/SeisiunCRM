import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// User management is super_admin-only. This is scoped to /settings/users
// specifically so it doesn't affect /settings/profile, which every user
// needs (profile info, password, Outlook connection).
export default async function SettingsUsersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/')
  }

  return <>{children}</>
}
