import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'
import { getTimeframeDates } from '@/lib/followup'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CLOSED_DEAL_STAGES = ['closed_won', 'closed_lost']

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'this-week'
    const { start, end } = getTimeframeDates(timeframe)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    const canSeeTeam = isManagerOrAbove(authUser.role)

    const [profilesRes, leadsRes, dealsRes, leadActsRes, dealActsRes] = await Promise.all([
      supabase.from('user_profiles').select('id, full_name, email, role').eq('status', 'active'),
      supabase.from('leads').select('id, assigned_rep_id, stage'),
      supabase.from('deals').select('id, assigned_rep_id, stage, reported_value, close_date'),
      supabase.from('lead_activities').select('logged_by, activity_date').gte('activity_date', startStr).lte('activity_date', endStr),
      supabase.from('deal_activities').select('logged_by, activity_date').gte('activity_date', startStr).lte('activity_date', endStr),
    ])

    if (profilesRes.error) throw profilesRes.error
    if (leadsRes.error) throw leadsRes.error
    if (dealsRes.error) throw dealsRes.error
    if (leadActsRes.error) throw leadActsRes.error
    if (dealActsRes.error) throw dealActsRes.error

    const profiles = canSeeTeam
      ? (profilesRes.data || [])
      : (profilesRes.data || []).filter(p => p.id === authUser.id)

    const leads = leadsRes.data || []
    const deals = dealsRes.data || []
    const allActs = [...(leadActsRes.data || []), ...(dealActsRes.data || [])]

    const rows = profiles.map(profile => {
      const repLeads = leads.filter(l => l.assigned_rep_id === profile.id)
      const repDeals = deals.filter(d => d.assigned_rep_id === profile.id)
      const openDeals = repDeals.filter(d => !CLOSED_DEAL_STAGES.includes(d.stage?.toLowerCase() || ''))
      const wonInPeriod = repDeals.filter(d => d.stage?.toLowerCase() === 'closed_won' && d.close_date && d.close_date >= startStr && d.close_date <= endStr)
      const lostInPeriod = repDeals.filter(d => d.stage?.toLowerCase() === 'closed_lost' && d.close_date && d.close_date >= startStr && d.close_date <= endStr)
      const activitiesInPeriod = allActs.filter(a => a.logged_by === profile.id).length

      return {
        id: profile.id,
        name: profile.full_name || profile.email || 'Team member',
        role: profile.role,
        activities: activitiesInPeriod,
        leadsOwned: repLeads.length,
        dealsOwned: { count: openDeals.length, value: openDeals.reduce((sum, d) => sum + Number(d.reported_value || 0), 0) },
        dealsWon: { count: wonInPeriod.length, value: wonInPeriod.reduce((sum, d) => sum + Number(d.reported_value || 0), 0) },
        winRate: (wonInPeriod.length + lostInPeriod.length) > 0
          ? Math.round((wonInPeriod.length / (wonInPeriod.length + lostInPeriod.length)) * 100)
          : null,
      }
    })

    rows.sort((a, b) => b.dealsWon.value - a.dealsWon.value || b.activities - a.activities)

    return NextResponse.json({ isTeamView: canSeeTeam, rows })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch team performance', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
