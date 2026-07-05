import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reason } = body

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id, stage')
      .eq('id', id)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
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

    return NextResponse.json(updatedLead)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
