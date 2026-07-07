import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

function camelCaseActivity(a: any) {
  if (!a) return null
  return {
    id: a.id,
    leadId: a.lead_id,
    activityType: a.activity_type,
    activityDate: a.activity_date,
    note: a.note,
    loggedBy: a.logged_by,
    createdAt: a.created_at
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
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
          note,
          logged_by: authUser.id
        })
        .select()
        .single()

      if (activityErr) throw activityErr
      return NextResponse.json(camelCaseActivity(activity), { status: 201 })
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  })
}
