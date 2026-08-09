import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDaysSinceContact } from '@/lib/followup'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    if (!isManagerOrAbove(authUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Calculate Monday of current week
    const now = new Date()
    const currentDay = now.getDay()
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay
    const monday = new Date(now)
    monday.setDate(now.getDate() + distanceToMonday)
    monday.setHours(0, 0, 0, 0)
    const mondayStr = monday.toISOString()

    // 2. Fetch Advances
    // lead_stage_history changed_at >= Monday and to_stage != 'contact'
    const { data: advancesData, error: advancesErr } = await supabase
      .from('lead_stage_history')
      .select(`
        from_stage,
        to_stage,
        changed_at,
        leads (
          opportunity_name,
          accounts (
            name
          )
        )
      `)
      .gte('changed_at', mondayStr)
      .neq('to_stage', 'contact')
      .order('changed_at', { ascending: false })
      .limit(5)

    if (advancesErr) throw advancesErr

    const advances = (advancesData || []).map((item: any) => {
      const lead = item.leads || {}
      const account = lead.accounts || {}
      return {
        opportunityName: lead.opportunity_name || 'Unknown Opportunity',
        accountName: account.name || 'Unknown Account',
        fromStage: item.from_stage || '',
        toStage: item.to_stage || '',
        changedAt: item.changed_at
      }
    })

    // 3. Fetch Stalled leads
    // stage in connected, presentation, demo, evaluating
    // last_connect_date is null or > 10 days ago
    const { data: leadsData, error: leadsErr } = await supabase
      .from('leads')
      .select(`
        opportunity_name,
        stage,
        last_connect_date,
        accounts (
          name
        )
      `)

    if (leadsErr) throw leadsErr

    const stalledRaw = (leadsData || []).filter((l: any) => {
      const stageLower = l.stage?.toLowerCase() || ''
      if (!['connected', 'presentation', 'demo', 'evaluating'].includes(stageLower)) return false
      
      const days = calculateDaysSinceContact(l.last_connect_date)
      return days === null || days > 10
    })

    const stalled = stalledRaw.map((l: any) => {
      const days = calculateDaysSinceContact(l.last_connect_date)
      return {
        opportunityName: l.opportunity_name || 'Unknown Opportunity',
        accountName: l.accounts?.name || 'Unknown Account',
        stage: l.stage,
        daysSinceContact: days
      }
    })

    stalled.sort((a, b) => {
      const daysA = a.daysSinceContact ?? 9999
      const daysB = b.daysSinceContact ?? 9999
      return daysB - daysA
    })
    const stalledLimit = stalled.slice(0, 5)

    // 4. Fetch New to Demo or Evaluating
    // lead_stage_history changed_at >= Monday and to_stage in demo, evaluating
    const { data: newToDemoData, error: newToDemoErr } = await supabase
      .from('lead_stage_history')
      .select(`
        to_stage,
        changed_at,
        leads (
          opportunity_name,
          accounts (
            name
          )
        )
      `)
      .gte('changed_at', mondayStr)
      .in('to_stage', ['demo', 'evaluating'])
      .order('changed_at', { ascending: false })
      .limit(3)

    if (newToDemoErr) throw newToDemoErr

    const newToDemo = (newToDemoData || []).map((item: any) => {
      const lead = item.leads || {}
      const account = lead.accounts || {}
      return {
        opportunityName: lead.opportunity_name || 'Unknown Opportunity',
        accountName: account.name || 'Unknown Account',
        stage: item.to_stage,
        reachedAt: item.changed_at
      }
    })

    return NextResponse.json({
      advances,
      stalled: stalledLimit,
      newToDemo
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch pulse activity data', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
