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

export async function GET() {
  try {
    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select(`
        *,
        account:accounts(*),
        contacts(*),
        activities:lead_activities(*),
        stageHistory:lead_stage_history(*)
      `)
      .order('created_at', { ascending: false })

    if (leadsErr) throw leadsErr

    const processedLeads = (leads || []).map(lead => {
      const activities = (lead.activities || []).sort((a: any, b: any) => 
        new Date(b.activity_date || b.created_at).getTime() - new Date(a.activity_date || a.created_at).getTime()
      )
      const stageHistory = (lead.stageHistory || []).sort((a: any, b: any) => 
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      )
      return camelCaseLead({
        ...lead,
        activities,
        stageHistory
      })
    })

    return NextResponse.json(processedLeads)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { opportunityName, accountName, accountId, salesRegion, forecastCloseDate, painPoints, dealValue } = body

    let finalAccountId = accountId
    if (!finalAccountId && accountName) {
      const { data: existingAccount } = await supabase
        .from('accounts')
        .select('id')
        .ilike('name', accountName)
        .maybeSingle()

      if (existingAccount) {
        finalAccountId = existingAccount.id
      } else {
        const { data: newAccount, error: accErr } = await supabase
          .from('accounts')
          .insert({
            name: accountName,
            sales_region: salesRegion || 'US East'
          })
          .select()
          .single()
        if (accErr) throw accErr
        finalAccountId = newAccount.id
      }
    }

    const { data: newLead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        opportunity_name: opportunityName,
        account_id: finalAccountId || null,
        stage: 'contact',
        open_date: new Date().toISOString().split('T')[0],
        forecast_close_date: forecastCloseDate || null,
        pain_points: painPoints,
        deal_value: dealValue !== undefined && dealValue !== null ? Number(dealValue) : 0
      })
      .select()
      .single()

    if (leadErr) throw leadErr

    const { error: histErr } = await supabase
      .from('lead_stage_history')
      .insert({
        lead_id: newLead.id,
        from_stage: null,
        to_stage: 'contact'
      })

    if (histErr) throw histErr

    const { data: leadWithRelations, error: fetchErr } = await supabase
      .from('leads')
      .select(`
        *,
        account:accounts(*),
        contacts(*),
        activities:lead_activities(*),
        stageHistory:lead_stage_history(*)
      `)
      .eq('id', newLead.id)
      .single()

    if (fetchErr) throw fetchErr

    return NextResponse.json(camelCaseLead(leadWithRelations), { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
