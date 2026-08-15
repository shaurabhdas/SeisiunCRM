import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      await requireAuth()

      const { data: integration } = await supabase
        .from('slack_integrations')
        .select('bot_access_token')
        .eq('id', 'default')
        .maybeSingle()

      if (!integration?.bot_access_token) {
        return NextResponse.json({ error: 'Slack is not connected.' }, { status: 400 })
      }

      const res = await fetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200',
        { headers: { Authorization: `Bearer ${integration.bot_access_token}` } }
      )
      const data: { ok: boolean; error?: string; channels?: Array<{ id: string; name: string; is_private: boolean }> } = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to list Slack channels')

      const channels = (data.channels || [])
        .map(c => ({ id: c.id, name: c.name, isPrivate: c.is_private }))
        .sort((a, b) => a.name.localeCompare(b.name))

      return NextResponse.json(channels)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
