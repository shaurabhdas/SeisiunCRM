import { supabase } from '@/lib/accounts'

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data: tokenRecord } = await supabase
    .from('microsoft_oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!tokenRecord) return null

  const now = new Date()
  const expiresAt = new Date(tokenRecord.expires_at)

  if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return tokenRecord.access_token
  }

  const refreshResponse = await fetch(
    `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: tokenRecord.refresh_token,
        grant_type: 'refresh_token',
      }),
    }
  )

  const newTokens = await refreshResponse.json()
  if (!refreshResponse.ok) return null

  const newExpiresAt = new Date(
    Date.now() + newTokens.expires_in * 1000
  ).toISOString()

  await supabase
    .from('microsoft_oauth_tokens')
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokenRecord.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return newTokens.access_token
}

export async function sendEmailViaGraph(
  accessToken: string,
  payload: {
    toRecipients: Array<{ name?: string; email: string }>
    ccRecipients: Array<{ name?: string; email: string }>
    subject: string
    bodyHtml: string
    attachments: Array<{ name: string; contentBytes: string }>
  }
): Promise<{ messageId: string }> {
  const message = {
    subject: payload.subject,
    body: { contentType: 'HTML', content: payload.bodyHtml },
    toRecipients: payload.toRecipients.map(r => ({
      emailAddress: { address: r.email, name: r.name || r.email },
    })),
    ccRecipients: payload.ccRecipients.map(r => ({
      emailAddress: { address: r.email, name: r.name || r.email },
    })),
    attachments: payload.attachments.map(a => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.name,
      contentBytes: a.contentBytes,
    })),
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Failed to send email via Microsoft Graph')
  }

  return { messageId: crypto.randomUUID() }
}
