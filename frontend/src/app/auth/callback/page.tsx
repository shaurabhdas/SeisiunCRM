'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const handleAuth = async () => {
      try {
        const supabase = createClient()

        // 1. Check for PKCE code in query params
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setError(error.message)
            router.push('/login?error=auth_error')
            return
          }
        }

        // 2. Check for Implicit Flow hash fragment
        const hash = window.location.hash
        if (hash) {
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            if (error) {
              setError(error.message)
              router.push('/login?error=auth_error')
              return
            }
          }
        }

        // 3. Check if user is logged in now
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('password_set')
            .eq('id', user.id)
            .single()

          if (!profile?.password_set) {
            router.push('/set-password')
            return
          }
          router.push('/')
        } else {
          router.push('/login?error=auth_error')
        }
      } catch (err) {
        setError(String(err))
        router.push('/login?error=auth_error')
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <div className="text-sm text-muted-foreground animate-pulse">
        {error ? 'Authentication failed, redirecting...' : 'Completing authentication...'}
      </div>
    </div>
  )
}
