import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      dealValue
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
        deal_value: dealValue !== undefined ? (dealValue !== null ? Number(dealValue) : 0) : lead.deal_value
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

    return NextResponse.json(updatedLead)
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
