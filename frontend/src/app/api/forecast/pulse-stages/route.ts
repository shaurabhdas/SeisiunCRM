import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Each displayed stage's confidence is the historical rate of leads that
// entered it going on to enter the stage they map to here — including
// 'evaluating', whose real next step is conversion to a won deal.
const NEXT_STAGE: Record<string, string> = {
  contact: 'outreach',
  outreach: 'connected',
  connected: 'presentation',
  presentation: 'demo',
  demo: 'evaluating',
  evaluating: 'deal'
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    if (!isManagerOrAbove(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: allLeads, error: leadsErr } = await supabase.from('leads').select('*')
    if (leadsErr) throw leadsErr

    const { data: allHistory, error: historyErr } = await supabase.from('lead_stage_history').select('*')
    if (historyErr) throw historyErr

    const leads = allLeads || []
    const history = allHistory || []

    const sequence = Object.keys(NEXT_STAGE)
    const result = []

    for (const stage of sequence) {
      const nextStage = NEXT_STAGE[stage]

      // Leads that ever entered this stage
      const enteredLeads = Array.from(new Set(
        history
          .filter(h => h.to_stage?.toLowerCase() === stage)
          .map(h => h.lead_id)
      ))

      const nEntered = enteredLeads.length

      if (nEntered < 2) {
        // Not enough historical volume to compute a meaningful rate yet.
        const currentCount = leads.filter(l => l.stage?.toLowerCase() === stage).length
        result.push({
          name: capitalize(stage),
          confidence: null,
          count: currentCount,
          insufficientData: true
        })
      } else {
        // Find how many of these entered leads ever entered the next stage
        const advancedLeads = Array.from(new Set(
          history
            .filter(h => h.to_stage?.toLowerCase() === nextStage && enteredLeads.includes(h.lead_id))
            .map(h => h.lead_id)
        ))
        const nAdvanced = advancedLeads.length
        const rate = Math.round((nAdvanced / nEntered) * 100)
        result.push({
          name: capitalize(stage),
          confidence: rate,
          insufficientData: false
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
