import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, canModifyRecord } from '@/lib/auth'
import { camelCaseLead } from '@/lib/leads'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { reason } = body

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id, stage, assigned_rep_id')
      .eq('id', id)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!canModifyRecord(authUser, lead.assigned_rep_id)) {
      return NextResponse.json({ error: 'Only the assigned rep or a manager can disqualify this lead.' }, { status: 403 })
    }

    const { data: updatedLead, error: updateErr } = await supabase
      .from('leads')
      .update({
        stage: 'disqualified',
        disqualification_reason: reason
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    const { error: histErr } = await supabase
      .from('lead_stage_history')
      .insert({
        lead_id: lead.id,
        from_stage: lead.stage,
        to_stage: 'disqualified'
      })

    if (histErr) throw histErr

    return NextResponse.json(camelCaseLead(updatedLead))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
  }
}
