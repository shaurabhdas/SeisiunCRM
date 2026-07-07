'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function setPassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' }
  }
  if (!/[A-Z]/.test(password)) {
    return { error: 'Password must contain at least one uppercase letter.' }
  }
  if (!/[0-9]/.test(password)) {
    return { error: 'Password must contain at least one number.' }
  }
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Session expired. Please use the invitation link again.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password })
  if (updateError) {
    return { error: 'Failed to set password. Please try again.' }
  }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      password_set: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Failed to update user profile password_set:', profileError)
    return { error: 'Failed to complete profile activation.' }
  }

  redirect('/')
}
