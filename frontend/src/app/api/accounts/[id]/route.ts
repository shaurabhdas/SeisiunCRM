import { NextResponse } from 'next/server'
import { supabase } from '@/lib/accounts'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, industry, company_size, sales_region, notes } = body

    const { data, error } = await supabase
      .from('accounts')
      .update({
        name,
        industry: industry || null,
        company_size: company_size || null,
        sales_region: sales_region || 'US East',
        notes: notes || null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    const { id } = await params
    console.error(`PUT /api/accounts/${id} error:`, error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Cascade delete via Supabase client
    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('account_id', id)

    const leadIds = (leads || []).map(l => l.id)

    if (leadIds.length > 0) {
      await supabase.from('lead_activities').delete().in('lead_id', leadIds)
      await supabase.from('lead_stage_history').delete().in('lead_id', leadIds)
    }

    await supabase.from('contacts').delete().eq('account_id', id)
    await supabase.from('leads').delete().eq('account_id', id)
    const { error } = await supabase.from('accounts').delete().eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const { id } = await params
    console.error(`DELETE /api/accounts/${id} error:`, error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
