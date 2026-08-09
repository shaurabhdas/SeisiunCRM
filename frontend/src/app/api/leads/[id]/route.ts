import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'
import { camelCaseLead } from '@/lib/leads'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      await requireAuth()
      const { id } = await params
      const body = await request.json()
      const {
        opportunityName,
        forecastCloseDate,
        competitor,
        painPoints,
        salesRegion,
        industry,
        companySize,
        dealValue,
        assignedRepId,
        assignedRepName,
        needsReassignment
      } = body

      const { data: lead, error: fetchErr } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchErr) throw fetchErr

      const { data: updatedLead, error: updateErr } = await supabase
        .from('leads')
        .update({
          opportunity_name: opportunityName !== undefined ? opportunityName : lead.opportunity_name,
          forecast_close_date: forecastCloseDate !== undefined ? (forecastCloseDate || null) : lead.forecast_close_date,
          competitor: competitor !== undefined ? competitor : lead.competitor,
          pain_points: painPoints !== undefined ? painPoints : lead.pain_points,
          deal_value: dealValue !== undefined ? (dealValue !== null ? Number(dealValue) : 0) : lead.deal_value,
          assigned_rep_id: assignedRepId !== undefined ? (assignedRepId || null) : lead.assigned_rep_id,
          assigned_rep_name: assignedRepName !== undefined ? (assignedRepName || null) : lead.assigned_rep_name,
          needs_reassignment: needsReassignment !== undefined ? needsReassignment : lead.needs_reassignment
        })
        .eq('id', id)
        .select()
        .single()

      if (updateErr) throw updateErr

      if (lead.account_id && (salesRegion !== undefined || industry !== undefined || companySize !== undefined)) {
        const { error: accErr } = await supabase
          .from('accounts')
          .update({
            sales_region: salesRegion !== undefined ? salesRegion : undefined,
            industry: industry !== undefined ? industry : undefined,
            company_size: companySize !== undefined ? companySize : undefined
          })
          .eq('id', lead.account_id)
        if (accErr) throw accErr
      }

      return NextResponse.json(camelCaseLead(updatedLead))
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      await requireAuth()
      const { id } = await params

      const { error: actErr } = await supabase
        .from('lead_activities')
        .delete()
        .eq('lead_id', id)
      if (actErr) throw actErr

      const { error: histErr } = await supabase
        .from('lead_stage_history')
        .delete()
        .eq('lead_id', id)
      if (histErr) throw histErr

      const { error: contactErr } = await supabase
        .from('contacts')
        .delete()
        .eq('lead_id', id)
      if (contactErr) throw contactErr

      const { error: leadErr } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
      if (leadErr) throw leadErr

      return NextResponse.json({ message: 'Lead deleted successfully' })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
