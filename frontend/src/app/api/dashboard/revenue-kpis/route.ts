import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTimeframeDates } from '@/lib/followup'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CLOSED_LEAD_STAGES = ['disqualified', 'deal']
const CLOSED_DEAL_STAGES = ['closed_won', 'closed_lost']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'this-week'
    const { start, end } = getTimeframeDates(timeframe)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const [leadsRes, dealsRes, leadActsRes, dealActsRes] = await Promise.all([
      supabase.from('leads').select('id, stage, deal_value, created_at'),
      supabase.from('deals').select('id, stage, reported_value, close_date, created_at'),
      supabase.from('lead_activities').select('id, activity_type, activity_date').gte('activity_date', startStr).lte('activity_date', endStr),
      supabase.from('deal_activities').select('id, activity_type, activity_date').gte('activity_date', startStr).lte('activity_date', endStr),
    ])

    if (leadsRes.error) throw leadsRes.error
    if (dealsRes.error) throw dealsRes.error
    if (leadActsRes.error) throw leadActsRes.error
    if (dealActsRes.error) throw dealActsRes.error

    const leads = leadsRes.data || []
    const deals = dealsRes.data || []

    // Point-in-time open pipeline: active leads + active deals, regardless of period
    const openPipelineValue =
      leads.filter(l => !CLOSED_LEAD_STAGES.includes(l.stage?.toLowerCase() || '')).reduce((sum, l) => sum + Number(l.deal_value || 0), 0) +
      deals.filter(d => !CLOSED_DEAL_STAGES.includes(d.stage?.toLowerCase() || '')).reduce((sum, d) => sum + Number(d.reported_value || 0), 0)

    // New leads created in period
    const newLeads = leads.filter(l => l.created_at >= startISO && l.created_at <= endISO)
    const newLeadsValue = newLeads.reduce((sum, l) => sum + Number(l.deal_value || 0), 0)

    // Deals won/lost by close_date in period
    const wonDeals = deals.filter(d => d.stage?.toLowerCase() === 'closed_won' && d.close_date && d.close_date >= startStr && d.close_date <= endStr)
    const lostDeals = deals.filter(d => d.stage?.toLowerCase() === 'closed_lost' && d.close_date && d.close_date >= startStr && d.close_date <= endStr)
    const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.reported_value || 0), 0)
    const lostValue = lostDeals.reduce((sum, d) => sum + Number(d.reported_value || 0), 0)
    const winRate = (wonDeals.length + lostDeals.length) > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : null

    // Activity counts in period, combining leads + deals
    const allActs = [...(leadActsRes.data || []), ...(dealActsRes.data || [])]
    const activityCounts = {
      calls: allActs.filter(a => a.activity_type?.toLowerCase() === 'call').length,
      emails: allActs.filter(a => a.activity_type?.toLowerCase() === 'email').length,
      meetings: allActs.filter(a => a.activity_type?.toLowerCase() === 'meeting').length,
      total: allActs.length,
    }

    return NextResponse.json({
      newLeads: { count: newLeads.length, value: newLeadsValue },
      dealsWon: { count: wonDeals.length, value: wonValue },
      dealsLost: { count: lostDeals.length, value: lostValue },
      winRate,
      openPipelineValue,
      activityCounts,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch revenue KPIs', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
