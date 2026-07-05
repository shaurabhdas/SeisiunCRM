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
    const contacts = lead.contacts || []
    const activities = lead.activities || []

    if (toStage !== 'disqualified') {
      if (fromStage === 'contact' && toStage === 'outreach') {
        const hasEmail = activities.some((a: any) => a.activity_type?.toLowerCase() === 'email')
        if (!hasEmail) return NextResponse.json({ error: 'At least one activity of type "email" is required to move to Outreach.' }, { status: 400 })
      }
      if (fromStage === 'outreach' && toStage === 'connected') {
        const hasCallOrMeeting = activities.some((a: any) => ['call', 'meeting'].includes(a.activity_type?.toLowerCase()))
        if (!hasCallOrMeeting) return NextResponse.json({ error: 'At least one activity of type "call" or "meeting" is required to move to Connected.' }, { status: 400 })
      }
      if (fromStage === 'connected' && toStage === 'presentation') {
        if (contacts.length === 0) return NextResponse.json({ error: 'At least one contact is required to move to Presentation.' }, { status: 400 })
      }
      if (fromStage === 'presentation' && toStage === 'demo') {
        const hasPresentation = activities.some((a: any) => a.activity_type?.toLowerCase() === 'presentation')
        if (!hasPresentation) return NextResponse.json({ error: 'At least one activity of type "presentation" is required to move to Demo.' }, { status: 400 })
      }
      if (fromStage === 'demo' && toStage === 'evaluating') {
        const hasDemo = activities.some((a: any) => a.activity_type?.toLowerCase() === 'demo')
        if (!hasDemo) return NextResponse.json({ error: 'At least one activity of type "demo" is required to move to Evaluating.' }, { status: 400 })
        if (!lead.forecast_close_date) return NextResponse.json({ error: 'Forecast Close Date must be set to move to Evaluating.' }, { status: 400 })
        const hasBuyerOrDecisionMaker = contacts.some((c: any) => ['economic_buyer', 'decision_maker'].includes(c.stakeholder_role?.toLowerCase() || ''))
        if (!hasBuyerOrDecisionMaker) return NextResponse.json({ error: 'At least one contact with role "Economic Buyer" or "Decision Maker" is required to move to Evaluating.' }, { status: 400 })
      }
      if (fromStage === 'evaluating' && toStage === 'deal') {
        if (!postDemoOutcome) return NextResponse.json({ error: 'A post demo outcome must be selected to close this lead.' }, { status: 400 })
        if (['not_now', 'not_a_fit'].includes(postDemoOutcome)) {
          const { data: updatedLead, error: upErr } = await supabase
            .from('leads')
            .update({
              stage: 'disqualified',
              post_demo_outcome: postDemoOutcome,
              disqualification_reason: postDemoOutcome === 'not_now' ? 'no_timing' : 'no_need'
            })
            .eq('id', lead.id)
            .select()
            .single()
          if (upErr) throw upErr

          const { error: histErr } = await supabase
            .from('lead_stage_history')
            .insert({
              lead_id: lead.id,
              from_stage: fromStage,
              to_stage: 'disqualified'
            })
          if (histErr) throw histErr

          return NextResponse.json({ message: 'Lead disqualified as part of evaluating outcome.', stage: 'disqualified' })
        }
      }
    }

    const { data: updatedLead, error: updateErr } = await supabase
      .from('leads')
      .update({
        stage: toStage,
        post_demo_outcome: toStage === 'deal' || toStage === 'evaluating' ? postDemoOutcome : lead.post_demo_outcome
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    const { error: histErr } = await supabase
      .from('lead_stage_history')
      .insert({
        lead_id: lead.id,
        from_stage: fromStage,
        to_stage: toStage
      })
    if (histErr) throw histErr

    return NextResponse.json(updatedLead)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
