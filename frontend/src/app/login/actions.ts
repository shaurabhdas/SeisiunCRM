'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const rawEmail = formData.get('email') as string
  const email = (rawEmail || '').trim().toLowerCase()
  const password = formData.get('password') as string

  // Reject oversized payloads before they reach password hashing/verification.
  if (!password || password.length > 15) {
    redirect('/login?error=invalid_credentials')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=invalid_credentials')
  }

  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
