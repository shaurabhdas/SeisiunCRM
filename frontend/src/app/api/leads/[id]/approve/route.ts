import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'
import { camelCaseLead, applyLeadStageTransition, applyLeadDisqualify } from '@/lib/leads'
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

      const { data: lead, error: leadErr } = await supabase
        .from('leads')
        .select('id, opportunity_name, pending_transition, pending_transition_requested_by, pending_transition_action')
        .eq('id', id)
        .single()
      if (leadErr || !lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }
      if (!lead.pending_transition) {
        return NextResponse.json({ error: 'This lead has no pending approval.' }, { status: 409 })
      }

      // Atomic claim: only proceeds if pending_transition is still set at
      // the moment this runs. If a concurrent approval already cleared it,
      // this update matches zero rows and .single() errors - treated as a
      // 409 rather than re-applying (and re-notifying) a second time.
      const { error: claimErr } = await supabase
        .from('leads')
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

      const payload = lead.pending_transition as any
      let updatedLead: any
      let responseMessage: string | null = null

      if (lead.pending_transition_action === 'disqualify') {
        updatedLead = await applyLeadDisqualify(id, payload.reason, authUser.id)
      } else {
        const result = await applyLeadStageTransition(id, payload.toStage, payload.postDemoOutcome, authUser.id)
        updatedLead = result.lead
        if (result.autoDisqualified) responseMessage = 'Lead disqualified as part of evaluating outcome.'
      }

      if (lead.pending_transition_requested_by) {
        await createNotification({
          recipientId: lead.pending_transition_requested_by,
          type: 'approval_granted',
          recordType: 'lead',
          recordId: id,
          recordName: lead.opportunity_name,
          message: `${authUser.full_name} approved your request on "${lead.opportunity_name}"`,
          actorId: authUser.id,
          actorName: authUser.full_name,
        })
      }

      if (responseMessage) {
        return NextResponse.json({ message: responseMessage, stage: 'disqualified' })
      }
      return NextResponse.json(camelCaseLead(updatedLead))
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
