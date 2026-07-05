import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function GET(request: NextRequest) {
  try {
    const { data: allLeads, error: leadsErr } = await supabase.from('leads').select('*')
    if (leadsErr) throw leadsErr

    const { data: allHistory, error: historyErr } = await supabase.from('lead_stage_history').select('*')
    if (historyErr) throw historyErr

    const leads = allLeads || []
    const history = allHistory || []

    const sequence = ['contact', 'outreach', 'connected', 'presentation', 'demo', 'evaluating']
    const result = []

    for (let i = 0; i < sequence.length; i++) {
      const stage = sequence[i]
      const nextStage = sequence[i + 1]

      // Leads that ever entered this stage
      const enteredLeads = Array.from(new Set(
        history
          .filter(h => h.to_stage?.toLowerCase() === stage)
          .map(h => h.lead_id)
      ))

      const nEntered = enteredLeads.length

      if (i === sequence.length - 1 || nEntered < 2) {
        // Insufficient history or last stage
        const currentCount = leads.filter(l => l.stage?.toLowerCase() === stage).length
        result.push({
          name: capitalize(stage),
          confidence: currentCount,
          count: currentCount,
          label: 'leads in stage'
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
          confidence: rate
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    )
  }
}
