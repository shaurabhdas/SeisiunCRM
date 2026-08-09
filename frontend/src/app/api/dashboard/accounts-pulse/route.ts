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
    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const [accountsRes, leadsRes, dealsRes] = await Promise.all([
      supabase.from('accounts').select('id, name, created_at'),
      supabase.from('leads').select('account_id, stage, deal_value'),
      supabase.from('deals').select('account_id, stage, reported_value'),
    ])

    if (accountsRes.error) throw accountsRes.error
    if (leadsRes.error) throw leadsRes.error
    if (dealsRes.error) throw dealsRes.error

    const accounts = accountsRes.data || []
    const leads = leadsRes.data || []
    const deals = dealsRes.data || []

    const newAccounts = accounts.filter(a => a.created_at >= startISO && a.created_at <= endISO)

    // Open pipeline value per account: active leads.deal_value + active deals.reported_value
    const pipelineByAccount = new Map<string, number>()
    leads
      .filter(l => l.account_id && !CLOSED_LEAD_STAGES.includes(l.stage?.toLowerCase() || ''))
      .forEach(l => {
        pipelineByAccount.set(l.account_id!, (pipelineByAccount.get(l.account_id!) || 0) + Number(l.deal_value || 0))
      })
    deals
      .filter(d => d.account_id && !CLOSED_DEAL_STAGES.includes(d.stage?.toLowerCase() || ''))
      .forEach(d => {
        pipelineByAccount.set(d.account_id!, (pipelineByAccount.get(d.account_id!) || 0) + Number(d.reported_value || 0))
      })

    const topAccounts = accounts
      .map(a => ({ id: a.id, name: a.name, openPipelineValue: pipelineByAccount.get(a.id) || 0 }))
      .filter(a => a.openPipelineValue > 0)
      .sort((a, b) => b.openPipelineValue - a.openPipelineValue)
      .slice(0, 5)

    return NextResponse.json({
      totalAccounts: accounts.length,
      newAccounts: newAccounts.length,
      topAccounts,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch accounts pulse', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
