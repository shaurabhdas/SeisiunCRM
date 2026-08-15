import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      await requireAuth()

      const { data } = await supabase
        .from('slack_integrations')
        .select('team_name, default_channel_name')
        .eq('id', 'default')
        .maybeSingle()

      return NextResponse.json({
        connected: !!data,
        teamName: data?.team_name || null,
        channelName: data?.default_channel_name || null,
      })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
