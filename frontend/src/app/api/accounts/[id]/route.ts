import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, canModifyRecord } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { name, industry, company_size, sales_region, notes } = body

    const { data: existingAccount, error: fetchErr } = await supabase
      .from('accounts')
      .select('created_by')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    if (!canModifyRecord(authUser, existingAccount.created_by)) {
      return NextResponse.json({ error: 'Only the account creator or a manager can update this account.' }, { status: 403 })
    }

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
    return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth()
    const { id } = await params

    const { data: existingAccount, error: fetchErr } = await supabase
      .from('accounts')
      .select('created_by')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    if (!canModifyRecord(authUser, existingAccount.created_by)) {
      return NextResponse.json({ error: 'Only the account creator or a manager can delete this account.' }, { status: 403 })
    }

    // Cascade delete in Supabase
    // Fetch all leads for this account
    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select('id')
      .eq('account_id', id)

    if (leadsErr) throw leadsErr

    const leadIds = (leads || []).map(l => l.id)

    if (leadIds.length > 0) {
      // Delete activities
      const { error: actErr } = await supabase
        .from('lead_activities')
        .delete()
        .in('lead_id', leadIds)
      if (actErr) throw actErr

      // Delete stage history
      const { error: histErr } = await supabase
        .from('lead_stage_history')
        .delete()
        .in('lead_id', leadIds)
      if (histErr) throw histErr
    }

    // Delete contacts
    const { error: contactsErr } = await supabase
      .from('contacts')
      .delete()
      .eq('account_id', id)
    if (contactsErr) throw contactsErr

    // Delete leads
    const { error: leadDeleteErr } = await supabase
      .from('leads')
      .delete()
      .eq('account_id', id)
    if (leadDeleteErr) throw leadDeleteErr

    // Delete account
    const { error: accDeleteErr } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
    if (accDeleteErr) throw accDeleteErr

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
  }
}
