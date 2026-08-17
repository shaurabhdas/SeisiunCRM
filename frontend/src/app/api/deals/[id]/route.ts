import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/accounts'
import { requireAuth, canModifyRecord } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth()
    const { id } = await params
    const body = await request.json()

    const { data: existingDeal, error: fetchErr } = await (supabase as any)
      .from('deals')
      .select('assigned_rep_id')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    if (!canModifyRecord(authUser, existingDeal.assigned_rep_id)) {
      return NextResponse.json({ error: 'Only the assigned rep or a manager can update this deal.' }, { status: 403 })
    }

    // Omit stage changes in this route as specified. Also omit the
    // pending_transition* columns - this is a generic edit endpoint reachable
    // by any rep who owns the deal, and those columns must only ever be
    // written by the gated stage/disqualify/approve routes, never forged or
    // cleared directly here.
    const {
      stage,
      pending_transition,
      pending_transition_requested_by,
      pending_transition_requested_by_name,
      pending_transition_requested_at,
      pending_transition_action,
      ...updates
    } = body

    const { data: updatedDeal, error } = await (supabase as any)
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    if (existingDeal.assigned_rep_id && existingDeal.assigned_rep_id !== authUser.id) {
      await createNotification({
        recipientId: existingDeal.assigned_rep_id,
        type: 'record_updated',
        recordType: 'deal',
        recordId: id,
        recordName: updatedDeal.opportunity_name,
        message: `${authUser.full_name} updated "${updatedDeal.opportunity_name}"`,
        actorId: authUser.id,
        actorName: authUser.full_name,
      })
    }

    return NextResponse.json(updatedDeal)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update deal', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth()
    const { id } = await params

    const { data: existingDeal, error: fetchErr } = await supabase
      .from('deals')
      .select('assigned_rep_id')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    if (!canModifyRecord(authUser, existingDeal.assigned_rep_id)) {
      return NextResponse.json({ error: 'Only the assigned rep or a manager can delete this deal.' }, { status: 403 })
    }

    // Delete in cascade order explicitly as requested
    const { error: histErr } = await supabase
      .from('deal_stage_history')
      .delete()
      .eq('deal_id', id)
    if (histErr) throw histErr

    const { error: actErr } = await supabase
      .from('deal_activities')
      .delete()
      .eq('deal_id', id)
    if (actErr) throw actErr

    // Finally delete the deal itself
    const { error: dealErr } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)
    if (dealErr) throw dealErr

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete deal', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
