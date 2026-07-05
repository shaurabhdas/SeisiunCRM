import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/accounts'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Omit stage changes in this route as specified
    const { stage, ...updates } = body

    const { data: updatedDeal, error } = await (supabase as any)
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updatedDeal)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update deal', details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
      { error: 'Failed to delete deal', details: String(error) },
      { status: 500 }
    )
  }
}
