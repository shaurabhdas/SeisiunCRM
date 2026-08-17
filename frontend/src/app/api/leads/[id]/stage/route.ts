import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth, canModifyRecord, isManagerOrAbove } from '@/lib/auth'
import { camelCaseLead, applyLeadStageTransition, getLeadStagePrerequisiteError } from '@/lib/leads'
import { notifyManagers, createNotification } from '@/lib/notifications'
import { notifyApprovalNeeded } from '@/lib/slack'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const { id } = await params
      const body = await request.json()
      const { toStage, postDemoOutcome } = body

      const { data: lead, error: leadErr } = await supabase
        .from('leads')
        .select(`
          *,
          contacts(*),
          activities:lead_activities(*)
        `)
        .eq('id', id)
        .single()

      if (leadErr || !lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
      }

      const fromStage = lead.stage

      // Unchanged from before this feature: only the owner/manager may
      // disqualify a lead via a negative post-demo outcome.
      if (fromStage === 'evaluating' && toStage === 'deal' && ['not_now', 'not_a_fit'].includes(postDemoOutcome)) {
        if (!canModifyRecord(authUser, lead.assigned_rep_id)) {
          return NextResponse.json({ error: 'Only the assigned rep or a manager can disqualify this lead.' }, { status: 403 })
        }
      }

      const prereqError = getLeadStagePrerequisiteError(lead, lead.contacts || [], lead.activities || [], toStage, postDemoOutcome)
      if (prereqError) {
        return NextResponse.json({ error: prereqError }, { status: 400 })
      }

      if (!isManagerOrAbove(authUser.role)) {
        if (lead.pending_transition) {
          return NextResponse.json({ error: 'This lead already has a stage change awaiting approval.' }, { status: 409 })
        }

        const { data: updatedLead, error: pendingErr } = await supabase
          .from('leads')
          .update({
            pending_transition: { toStage, postDemoOutcome },
            pending_transition_requested_by: authUser.id,
            pending_transition_requested_by_name: authUser.full_name,
            pending_transition_requested_at: new Date().toISOString(),
            pending_transition_action: 'stage',
          })
          .eq('id', id)
          .select()
          .single()
        if (pendingErr) throw pendingErr

        const link = `${process.env.NEXT_PUBLIC_SITE_URL}/leads?lead=${id}`
        await notifyManagers({
          type: 'approval_requested',
          recordType: 'lead',
          recordId: id,
          recordName: lead.opportunity_name,
          message: `${authUser.full_name} requested to move "${lead.opportunity_name}" to ${toStage}`,
          actorId: authUser.id,
          actorName: authUser.full_name,
        })
        await notifyApprovalNeeded({
          recordType: 'lead',
          recordName: lead.opportunity_name,
          requestedByName: authUser.full_name,
          link,
        })

        return NextResponse.json(camelCaseLead(updatedLead))
      }

      const hadPendingRequest = !!lead.pending_transition
      const previousRequester = lead.pending_transition_requested_by

      const { lead: updatedLead, autoDisqualified } = await applyLeadStageTransition(id, toStage, postDemoOutcome, authUser.id)

      if (hadPendingRequest && previousRequester && previousRequester !== authUser.id) {
        await createNotification({
          recipientId: previousRequester,
          type: 'record_updated',
          recordType: 'lead',
          recordId: id,
          recordName: lead.opportunity_name,
          message: `${authUser.full_name} updated "${lead.opportunity_name}" directly, superseding your pending request`,
          actorId: authUser.id,
          actorName: authUser.full_name,
        })
      }

      if (autoDisqualified) {
        return NextResponse.json({ message: 'Lead disqualified as part of evaluating outcome.', stage: 'disqualified' })
      }
      return NextResponse.json(camelCaseLead(updatedLead))
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
