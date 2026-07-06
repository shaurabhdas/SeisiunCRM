import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function camelCaseLead(lead: any) {
  if (!lead) return null
  return {
    id: lead.id,
    opportunityName: lead.opportunity_name,
    accountId: lead.account_id,
    stage: lead.stage,
    openDate: lead.open_date,
    forecastCloseDate: lead.forecast_close_date,
    painPoints: lead.pain_points,
    competitor: lead.competitor,
    lastConnectDate: lead.last_connect_date,
    assignedRepId: lead.assigned_rep_id,
    assignedRepName: lead.assigned_rep_name,
    needsReassignment: lead.needs_reassignment,
    disqualificationReason: lead.disqualification_reason,
    postDemoOutcome: lead.post_demo_outcome,
    dealValue: lead.deal_value,
    createdAt: lead.created_at,
    account: lead.account ? {
      id: lead.account.id,
      name: lead.account.name,
      notes: lead.account.notes,
      industry: lead.account.industry,
      companySize: lead.account.company_size,
      salesRegion: lead.account.sales_region,
      createdAt: lead.account.created_at
    } : null,
    contacts: (lead.contacts || []).map((c: any) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phone: c.phone,
      leadId: c.lead_id,
      accountId: c.account_id,
      stakeholderRole: c.stakeholder_role,
      createdAt: c.created_at
    })),
    activities: (lead.activities || []).map((a: any) => ({
      id: a.id,
      leadId: a.lead_id,
      activityType: a.activity_type,
      activityDate: a.activity_date,
      note: a.note,
      loggedBy: a.logged_by,
      createdAt: a.created_at
    })),
    stageHistory: (lead.stageHistory || []).map((h: any) => ({
      id: h.id,
      leadId: h.lead_id,
      fromStage: h.from_stage,
      toStage: h.to_stage,
      changedAt: h.changed_at,
      changedBy: h.changed_by
    }))
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
