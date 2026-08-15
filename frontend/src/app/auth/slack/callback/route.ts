import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const redirectBase = `${process.env.NEXT_PUBLIC_SITE_URL}/settings/integrations`

  const cookieStore = await cookies()
  const expectedState = cookieStore.get('slack_oauth_state')?.value
  cookieStore.delete('slack_oauth_state')

  if (error || !code || !state || state !== expectedState) {
    return NextResponse.redirect(`${redirectBase}?error=slack_oauth_failed`)
  }

  try {
    const authUser = await requireAuth()
    if (authUser.role !== 'super_admin') {
      return NextResponse.redirect(`${redirectBase}?error=slack_oauth_failed`)
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }),
    })

    const tokens = await tokenResponse.json()
    if (!tokens.ok) {
      throw new Error(tokens.error || 'Token exchange failed')
    }

    await supabase
      .from('slack_integrations')
      .upsert({
        id: 'default',
        team_id: tokens.team?.id,
        team_name: tokens.team?.name,
        bot_access_token: tokens.access_token,
        connected_by: authUser.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    return NextResponse.redirect(`${redirectBase}?success=slack_connected`)
  } catch {
    return NextResponse.redirect(`${redirectBase}?error=slack_oauth_failed`)
  }
}
