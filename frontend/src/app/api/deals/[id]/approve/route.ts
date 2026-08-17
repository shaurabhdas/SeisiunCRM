import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { updateDealStage } from '@/lib/deals'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      if (!isManagerOrAbove(authUser.role)) {
        return NextResponse.json({ error: 'Only a manager or super admin can approve.' }, { status: 403 })
      }
      const { id } = await params

      const { data: deal, error: dealErr } = await supabase
        .from('deals')
        .select('id, opportunity_name, pending_transition, pending_transition_requested_by')
        .eq('id', id)
        .single()
      if (dealErr || !deal) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
      }
      if (!deal.pending_transition) {
        return NextResponse.json({ error: 'This deal has no pending approval.' }, { status: 409 })
      }

      // Atomic claim - see api/leads/[id]/approve/route.ts for the race this guards against.
      const { error: claimErr } = await supabase
        .from('deals')
        .update({
          pending_transition: null,
          pending_transition_requested_by: null,
          pending_transition_requested_by_name: null,
          pending_transition_requested_at: null,
          pending_transition_action: null,
        })
        .eq('id', id)
        .not('pending_transition', 'is', null)
        .select()
        .single()
      if (claimErr) {
        return NextResponse.json({ error: 'This request was already handled.' }, { status: 409 })
      }

      const { toStage, ...options } = deal.pending_transition as any
      const result = await updateDealStage(id, toStage, options, authUser.id)

      if (deal.pending_transition_requested_by) {
        await createNotification({
          recipientId: deal.pending_transition_requested_by,
          type: 'approval_granted',
          recordType: 'deal',
          recordId: id,
          recordName: deal.opportunity_name,
          message: `${authUser.full_name} approved your request on "${deal.opportunity_name}"`,
          actorId: authUser.id,
          actorName: authUser.full_name,
        })
      }

      return NextResponse.json({
        ...result.deal,
        deal: result.deal,
        showConversionPrompt: result.showConversionPrompt
      })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
