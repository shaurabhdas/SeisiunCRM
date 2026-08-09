import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'
import { camelCaseLead } from '@/lib/leads'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
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

      const processedLeads = (leads || []).map((lead: any) => {
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
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      console.log('AUTH USER IN POST /api/leads:', JSON.stringify(authUser))
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
          deal_value: dealValue !== undefined && dealValue !== null ? Number(dealValue) : 0,
          assigned_rep_id: authUser.id,
          assigned_rep_name: authUser.full_name
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
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
