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

function calculateDays(dateStr: string | null): number | null {
  if (!dateStr) return null
  const dateOnly = dateStr.split('T')[0]
  const today = new Date()
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const [year, month, day] = dateOnly.split('-').map(Number)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  const lastUTC = Date.UTC(year, month - 1, day)
  const diffTime = todayUTC - lastUTC
  if (diffTime < 0) return 0
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
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

    // Fetch Deals and Deal Activities
    const { data: dealsData, error: dealsErr } = await supabase.from('deals').select('*')
    if (dealsErr) throw dealsErr

    const { data: dealActivities, error: dealActsErr } = await supabase.from('deal_activities').select('*')
    if (dealActsErr) throw dealActsErr

    const activeLeads = (leads || []).filter(l => l.stage !== 'disqualified')
    const accountMap = new Map((accounts || []).map(a => [a.id, a.name]))

    const now = new Date()
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(now.getDate() - 14)

    // Map Leads
    const leadRows = activeLeads.map(l => {
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
        isDeal: false,
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

    // Filter active deals: proposal_submitted or negotiation
    const activeDeals = (dealsData || []).filter(d => ['proposal_submitted', 'negotiation'].includes(d.stage))

    // Map Deals
    const dealRows = activeDeals.map(d => {
      const dActivities = (dealActivities || []).filter(act => act.deal_id === d.id)
        .sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())

      const lastActDate = dActivities.length > 0 ? dActivities[0].activity_date : null
      const daysSinceAct = calculateDays(lastActDate)

      const riskFlags: string[] = []
      if (daysSinceAct === null || daysSinceAct >= 7) {
        riskFlags.push('Stale deal')
      }

      // Convert stage to display format
      const displayStage = d.stage === 'proposal_submitted' ? 'Proposal' : 'Negotiation'

      return {
        id: d.id,
        isDeal: true,
        account: accountMap.get(d.account_id) || 'Unknown',
        dealName: d.opportunity_name,
        dealSize: formatK(Number(d.reported_value || 0)),
        value: Number(d.reported_value || 0),
        stageProbability: d.value_confidence === 'confirmed' ? 'Confirmed' : 'Estimated',
        stageProbabilityRaw: d.value_confidence === 'confirmed' ? 100 : 50,
        step: displayStage,
        lastAction: daysSinceAct === null ? 'No activity' : `${daysSinceAct} days ago`,
        riskFlags,
        valueArrow: 'stable',
        timelineArrow: 'stable',
        activityVelocity: 'DEAL',
        activityCount: dActivities.length,
        overrideRiskFlag: false,
        customRiskText: null,
        manualProbability: null,
        expectedCloseDate: d.forecast_close_date
      }
    })

    // Combine with visual separator if there are deals
    const result = [...leadRows]
    if (dealRows.length > 0) {
      result.push({
        id: 'separator-active-deals',
        isSeparator: true,
        account: 'Active Deals',
        dealName: '',
        dealSize: '',
        value: 0,
        stageProbability: '',
        stageProbabilityRaw: 0,
        step: '',
        lastAction: '',
        riskFlags: [],
        valueArrow: 'stable',
        timelineArrow: 'stable',
        activityVelocity: '',
        activityCount: 0,
        overrideRiskFlag: false,
        customRiskText: null,
        manualProbability: null,
        expectedCloseDate: null,
        isDeal: false
      } as any)
      result.push(...dealRows)
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    )
  }
}
