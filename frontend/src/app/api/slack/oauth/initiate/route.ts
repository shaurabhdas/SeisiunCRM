import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  await requireAuth()

  const clientId = process.env.SLACK_CLIENT_ID
  const redirectUri = process.env.SLACK_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Slack OAuth is not configured. Contact your administrator.' },
      { status: 503 }
    )
  }

  const scopes = ['chat:write', 'chat:write.public', 'channels:read', 'groups:read', 'team:read', 'users:read.email'].join(',')

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('slack_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const authUrl = new URL('https://slack.com/oauth/v2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
