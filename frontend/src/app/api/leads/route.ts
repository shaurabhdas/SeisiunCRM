import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      return {
        ...lead,
        activities,
        stageHistory
      }
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

    return NextResponse.json(leadWithRelations, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
