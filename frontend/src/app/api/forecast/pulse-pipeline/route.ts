import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const formatK = (val: number) => `$${Math.round(val / 1000)}K`

const STAGE_PROBABILITIES: Record<string, number> = {
  contact: 10,
  outreach: 20,
  connected: 40,
  presentation: 60,
  demo: 80,
  evaluating: 90
}

export async function GET(request: NextRequest) {
  try {
    const { data: leads, error: leadsErr } = await supabase.from('leads').select('*')
    if (leadsErr) throw leadsErr

    const { data: accounts, error: accountsErr } = await supabase.from('accounts').select('id, name')
    if (accountsErr) throw accountsErr

    const { data: contacts, error: contactsErr } = await supabase.from('contacts').select('*')
    if (contactsErr) throw contactsErr

    const { data: activities, error: activitiesErr } = await supabase.from('lead_activities').select('*')
    if (activitiesErr) throw activitiesErr

    const activeLeads = (leads || []).filter(l => l.stage !== 'disqualified')
    const accountMap = new Map((accounts || []).map(a => [a.id, a.name]))

    const now = new Date()
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(now.getDate() - 14)

    const result = activeLeads.map(l => {
      const leadContacts = (contacts || []).filter(c => c.lead_id === l.id)
      const leadActivities = (activities || []).filter(act => act.lead_id === l.id)

      const recentActivitiesCount = leadActivities.filter(act => {
        if (!act.activity_date) return false
        const actDate = new Date(act.activity_date)
        return actDate >= fourteenDaysAgo
      }).length

      const prob = STAGE_PROBABILITIES[l.stage?.toLowerCase()] || 10

      const riskFlags: string[] = []
      if (recentActivitiesCount === 0 && ['connected', 'presentation', 'demo', 'evaluating'].includes(l.stage?.toLowerCase())) {
        riskFlags.push('Stale opportunity')
      }
      const hasChampion = leadContacts.some(c => c.stakeholder_role === 'champion')
      if (!hasChampion && ['connected', 'presentation', 'demo', 'evaluating'].includes(l.stage?.toLowerCase())) {
        riskFlags.push('No champion identified')
      }

      return {
        id: l.id,
        account: accountMap.get(l.account_id) || 'Unknown',
        dealName: l.opportunity_name,
        dealSize: formatK(Number(l.deal_value || 0)),
        value: Number(l.deal_value || 0),
        stageProbability: `${prob}%`,
        stageProbabilityRaw: prob,
        step: l.stage,
        lastAction: l.pain_points || 'No action defined',
        riskFlags,
        valueArrow: 'stable',
        timelineArrow: 'stable',
        activityVelocity: `${recentActivitiesCount} touches`,
        activityCount: recentActivitiesCount,
        overrideRiskFlag: false,
        customRiskText: null,
        manualProbability: null,
        expectedCloseDate: l.forecast_close_date
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    )
  }
}
