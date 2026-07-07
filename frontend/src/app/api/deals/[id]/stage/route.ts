import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { updateDealStage } from '@/lib/deals'
import { requireAuth } from '@/lib/auth'

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
      const lost_reason = options.lost_reason

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

      // Progression rules passed. Update the stage.
      const result = await updateDealStage(id, toStage, options, authUser.id)
      return NextResponse.json({
        ...result.deal,
        deal: result.deal,
        showConversionPrompt: result.showConversionPrompt
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to update deal stage', details: String(error) },
        { status: 500 }
      )
    }
  })
}
