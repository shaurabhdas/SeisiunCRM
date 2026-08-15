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
        .select('default_channel_id, default_channel_name, notify_new_lead, notify_deal_won, notify_deal_lost')
        .eq('id', 'default')
        .maybeSingle()

      return NextResponse.json({
        channelId: data?.default_channel_id || null,
        channelName: data?.default_channel_name || null,
        notifyNewLead: data?.notify_new_lead ?? true,
        notifyDealWon: data?.notify_deal_won ?? true,
        notifyDealLost: data?.notify_deal_lost ?? false,
      })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}

export async function PUT(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      if (authUser.role !== 'super_admin') {
        return NextResponse.json({ error: 'Only a super admin can change Slack settings.' }, { status: 403 })
      }

      const { channelId, channelName, notifyNewLead, notifyDealWon, notifyDealLost } = await request.json()

      const { error } = await supabase
        .from('slack_integrations')
        .update({
          default_channel_id: channelId ?? null,
          default_channel_name: channelName ?? null,
          notify_new_lead: !!notifyNewLead,
          notify_deal_won: !!notifyDealWon,
          notify_deal_lost: !!notifyDealLost,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'default')

      if (error) throw error
      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
