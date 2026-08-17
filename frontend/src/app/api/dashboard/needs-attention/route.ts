import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDaysSinceContact } from '@/lib/followup'
import { requireAuth } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const [dealsRes, dealActsRes, leadsRes, accountsRes, tasksRes] = await Promise.all([
      supabase.from('deals').select('id, opportunity_name, account_id, stage, reported_value').in('stage', ['proposal_submitted', 'negotiation']),
      supabase.from('deal_activities').select('deal_id, activity_date').order('activity_date', { ascending: false }),
      supabase.from('leads').select('id, opportunity_name, account_id, stage, deal_value, last_connect_date').eq('stage', 'evaluating'),
      supabase.from('accounts').select('id, name'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).lt('due_date', new Date().toISOString().split('T')[0]).neq('status', 'complete'),
    ])

    if (dealsRes.error) throw dealsRes.error
    if (dealActsRes.error) throw dealActsRes.error
    if (leadsRes.error) throw leadsRes.error
    if (accountsRes.error) throw accountsRes.error
    if (tasksRes.error) throw tasksRes.error

    const accountMap = new Map((accountsRes.data || []).map(a => [a.id, a.name]))
    const lastActByDeal = new Map<string, string>()
    ;(dealActsRes.data || []).forEach(act => {
      if (!lastActByDeal.has(act.deal_id)) lastActByDeal.set(act.deal_id, act.activity_date)
    })

    const stalledDeals = (dealsRes.data || [])
      .map(d => {
        const days = calculateDaysSinceContact(lastActByDeal.get(d.id) || null)
        return { ...d, accountName: accountMap.get(d.account_id || '') || 'Unknown', daysSinceContact: days }
      })
      .filter(d => d.daysSinceContact === null || d.daysSinceContact >= 7)
      .sort((a, b) => (b.daysSinceContact ?? 9999) - (a.daysSinceContact ?? 9999))

    const stalledLeads = (leadsRes.data || [])
      .map(l => {
        const days = calculateDaysSinceContact(l.last_connect_date)
        return { ...l, accountName: accountMap.get(l.account_id || '') || 'Unknown', daysSinceContact: days }
      })
      .filter(l => l.daysSinceContact === null || l.daysSinceContact >= 10)
      .sort((a, b) => (b.daysSinceContact ?? 9999) - (a.daysSinceContact ?? 9999))

    return NextResponse.json({
      stalledDeals: { total: stalledDeals.length, items: stalledDeals.slice(0, 5) },
      stalledLeads: { total: stalledLeads.length, items: stalledLeads.slice(0, 5) },
      overdueTasks: tasksRes.count || 0,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch needs-attention data', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
