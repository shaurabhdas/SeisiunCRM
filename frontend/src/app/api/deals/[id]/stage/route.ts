import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { updateDealStage } from '@/lib/deals'
import { requireAuth, canModifyRecord, isManagerOrAbove } from '@/lib/auth'
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
      const { toStage, ...options } = body

      if (!toStage) {
        return NextResponse.json({ error: 'Missing toStage parameter' }, { status: 400 })
      }

      // Fetch the current deal state
      const { data: deal, error: dealErr } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .single()

      if (dealErr || !deal) {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
      }

      const fromStage = deal.stage

      // Rule 1: Proposal Submitted to Negotiation
      if (fromStage === 'proposal_submitted' && toStage === 'negotiation') {
        if (!deal.proposal_date) {
          return NextResponse.json(
            { error: 'A proposal date must be set on the deal before advancing.' },
            { status: 400 }
          )
        }

        // Fetch activities logged for this deal
        const { data: activities, error: actErr } = await supabase
          .from('deal_activities')
          .select('*')
          .eq('deal_id', id)

        if (actErr) throw actErr

        const proposalTime = new Date(deal.proposal_date).getTime()
        const hasActivityAfterProposal = (activities || []).some((act: any) => {
          if (!act.activity_date) return false
          // Compare dates (since activity_date is a DATE, compare midnight timestamps)
          const actTime = new Date(act.activity_date).getTime()
          return actTime >= proposalTime
        })

        if (!hasActivityAfterProposal) {
          return NextResponse.json(
            { error: 'Log at least one activity after the proposal date to advance to Negotiation.' },
            { status: 400 }
          )
        }
      }

      // Rule 2: Negotiation to Closed Won
      if (fromStage === 'negotiation' && toStage === 'closed_won') {
        const sowRef = options.sow_reference !== undefined ? options.sow_reference : deal.sow_reference
        const closeDate = options.close_date !== undefined ? options.close_date : deal.close_date

        if (!sowRef || !closeDate) {
          return NextResponse.json(
            { error: 'Enter the SOW reference number and close date before marking as Closed Won.' },
            { status: 400 }
          )
        }
      }

      // Rule 3: Any stage to Closed Lost
      if (toStage === 'closed_lost') {
        if (!canModifyRecord(authUser, deal.assigned_rep_id)) {
          return NextResponse.json({ error: 'Only the assigned rep or a manager can mark this deal as lost.' }, { status: 403 })
        }

        const lostReason = options.lost_reason !== undefined
          ? options.lost_reason
          : deal.lost_reason
        const allowedReasons = [
          'lost_to_competitor',
          'budget_frozen',
          'no_decision',
          'scope_too_large',
          'timing'
        ]

        if (!lostReason || !allowedReasons.includes(lostReason)) {
          return NextResponse.json(
            {
              error: 'A valid lost reason must be selected to close the deal as lost. Options are: Lost to Competitor, Budget Frozen, No Decision, Scope Too Large, Timing.'
            },
            { status: 400 }
          )
        }
      }

      // Rule 4: Any stage to On Hold
      if (toStage === 'on_hold') {
        const resumeDate = options.on_hold_resume_date !== undefined ? options.on_hold_resume_date : deal.on_hold_resume_date
        if (!resumeDate) {
          return NextResponse.json(
            { error: 'An on-hold resume date must be set to put the deal on hold.' },
            { status: 400 }
          )
        }
      }

      // Progression rules passed.
      if (!isManagerOrAbove(authUser.role)) {
        if (deal.pending_transition) {
          return NextResponse.json({ error: 'This deal already has a stage change awaiting approval.' }, { status: 409 })
        }

        const { data: updatedDeal, error: pendingErr } = await supabase
          .from('deals')
          .update({
            pending_transition: { toStage, ...options },
            pending_transition_requested_by: authUser.id,
            pending_transition_requested_by_name: authUser.full_name,
            pending_transition_requested_at: new Date().toISOString(),
            pending_transition_action: 'stage',
          })
          .eq('id', id)
          .select()
          .single()
        if (pendingErr) throw pendingErr

        const link = `${process.env.NEXT_PUBLIC_SITE_URL}/deals/pipeline?deal=${id}`
        await notifyManagers({
          type: 'approval_requested',
          recordType: 'deal',
          recordId: id,
          recordName: deal.opportunity_name,
          message: `${authUser.full_name} requested to move "${deal.opportunity_name}" to ${toStage}`,
          actorId: authUser.id,
          actorName: authUser.full_name,
        })
        await notifyApprovalNeeded({
          recordType: 'deal',
          recordName: deal.opportunity_name,
          requestedByName: authUser.full_name,
          link,
        })

        return NextResponse.json({ ...updatedDeal, deal: updatedDeal, showConversionPrompt: false })
      }

      const hadPendingRequest = !!deal.pending_transition
      const previousRequester = deal.pending_transition_requested_by

      const result = await updateDealStage(id, toStage, options, authUser.id)

      if (hadPendingRequest && previousRequester && previousRequester !== authUser.id) {
        await createNotification({
          recipientId: previousRequester,
          type: 'record_updated',
          recordType: 'deal',
          recordId: id,
          recordName: deal.opportunity_name,
          message: `${authUser.full_name} updated "${deal.opportunity_name}" directly, superseding your pending request`,
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
      return NextResponse.json(
        { error: 'Failed to update deal stage', details: error instanceof Error ? error.message : JSON.stringify(error) },
        { status: 500 }
      )
    }
  })
}
