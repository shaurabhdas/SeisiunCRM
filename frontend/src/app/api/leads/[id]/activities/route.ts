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
    const { activityType, activityDate, note } = body

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id')
      .eq('id', id)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data: activity, error: activityErr } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: lead.id,
        activity_type: activityType,
        activity_date: activityDate ? new Date(activityDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        note
      })
      .select()
      .single()

    if (activityErr) throw activityErr
    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
