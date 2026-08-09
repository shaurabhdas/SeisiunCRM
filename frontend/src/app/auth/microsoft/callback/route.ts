import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/profile?error=microsoft_oauth_failed`
    )
  }

  try {
    const authUser = await requireAuth()

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          code,
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
          grant_type: 'authorization_code',
        }),
      }
    )

    const tokens = await tokenResponse.json()

    if (!tokenResponse.ok) {
      throw new Error(tokens.error_description || 'Token exchange failed')
    }

    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const msUser = await userResponse.json()

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabase
      .from('microsoft_oauth_tokens')
      .upsert({
        user_id: authUser.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        outlook_email: msUser.mail || msUser.userPrincipalName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/profile?success=outlook_connected`
    )
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/settings/profile?error=microsoft_oauth_failed`
    )
  }
}
