import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const formatK = (val: number) => `$${Math.round(val / 1000)}K`

export async function GET(request: NextRequest) {
  try {
    const { data: allLeads, error: leadsErr } = await supabase.from('leads').select('*')
    if (leadsErr) throw leadsErr

    const { data: allContacts, error: contactsErr } = await supabase.from('contacts').select('*')
    if (contactsErr) throw contactsErr

    const { data: allHistory, error: historyErr } = await supabase.from('lead_stage_history').select('*')
    if (historyErr) throw historyErr

    const leads = allLeads || []
    const contacts = allContacts || []
    const history = allHistory || []

    const now = new Date()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(now.getDate() - 7)
    
    // Commit Forecast leads (demo or evaluating AND last_connect_date is within last 7 days)
    const commitLeads = leads.filter(l => {
      const stageLower = l.stage?.toLowerCase()
      if (stageLower !== 'demo' && stageLower !== 'evaluating') return false
      if (!l.last_connect_date) return false
      const connDate = new Date(l.last_connect_date)
      return connDate >= sevenDaysAgo
    })

    const commitForecastValue = commitLeads.reduce((sum, l) => sum + Number(l.deal_value || 0), 0)

    // Confidence percentage calculation
    let confidence = 0
    if (commitLeads.length > 0) {
      let confidentCount = 0
      commitLeads.forEach(l => {
        const leadContacts = contacts.filter(c => c.lead_id === l.id)
        const hasChampion = leadContacts.some(c => c.stakeholder_role === 'champion')
        const hasEconomicBuyer = leadContacts.some(c => c.stakeholder_role === 'economic_buyer')
        if (hasChampion && hasEconomicBuyer) {
          confidentCount++
        }
      })
      confidence = Math.round((confidentCount / commitLeads.length) * 100)
    }

    // Best Case: sum of deal_value across all active leads where stage is connected, presentation, demo, or evaluating
    const bestCaseLeads = leads.filter(l => 
      ['connected', 'presentation', 'demo', 'evaluating'].includes(l.stage?.toLowerCase() || '')
    )
    const bestCaseValue = bestCaseLeads.reduce((sum, l) => sum + Number(l.deal_value || 0), 0)

    // Likely Slip: Sum of deal_value across leads where forecast_close_date is within next 60 days
    // AND last_connect_date is more than 10 days ago or is null AND stage is connected, presentation, demo, or evaluating
    const sixtyDaysLater = new Date()
    sixtyDaysLater.setDate(now.getDate() + 60)
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(now.getDate() - 10)

    const likelySlipLeads = leads.filter(l => {
      if (!['connected', 'presentation', 'demo', 'evaluating'].includes(l.stage?.toLowerCase() || '')) return false
      if (!l.forecast_close_date) return false
      const closeDate = new Date(l.forecast_close_date)
      if (closeDate < now || closeDate > sixtyDaysLater) return false
      
      if (!l.last_connect_date) return true
      const connDate = new Date(l.last_connect_date)
      return connDate < tenDaysAgo
    })
    const likelySlipValue = likelySlipLeads.reduce((sum, l) => sum + Number(l.deal_value || 0), 0)

    // Commit up / down indicator
    const eightDaysAgo = new Date()
    eightDaysAgo.setDate(now.getDate() - 8)
    const sixDaysAgo = new Date()
    sixDaysAgo.setDate(now.getDate() - 6)

    const historySevenDaysAgo = history.filter(h => {
      if (!h.changed_at) return false
      const changedDate = new Date(h.changed_at)
      return changedDate >= eightDaysAgo && changedDate <= sixDaysAgo && ['demo', 'evaluating'].includes(h.to_stage?.toLowerCase() || '')
    })

    const uniqueLeadIds7DaysAgo = Array.from(new Set(historySevenDaysAgo.map(h => h.lead_id)))
    const leads7DaysAgo = leads.filter(l => uniqueLeadIds7DaysAgo.includes(l.id))
    const value7DaysAgo = leads7DaysAgo.reduce((sum, l) => sum + Number(l.deal_value || 0), 0)

    let commitIndicator = ""
    if (historySevenDaysAgo.length > 0) {
      const diff = commitForecastValue - value7DaysAgo
      if (diff > 0) {
        commitIndicator = `Commit up ${formatK(diff)}`
      } else if (diff < 0) {
        commitIndicator = `Commit down ${formatK(Math.abs(diff))}`
      } else {
        commitIndicator = "Commit unchanged"
      }
    }

    // Newly qualified value: sum of deal_value for leads that entered connected+ in last 7 days
    const qualifiedStages = ['connected', 'presentation', 'demo', 'evaluating']
    const recentQualifiedHistory = history.filter(h => {
      if (!h.changed_at) return false
      const changedDate = new Date(h.changed_at)
      return changedDate >= sevenDaysAgo && qualifiedStages.includes(h.to_stage?.toLowerCase() || '')
    })
    const uniqueQualifiedLeadIds = Array.from(new Set(recentQualifiedHistory.map(h => h.lead_id)))
    const newlyQualifiedValue = leads
      .filter(l => uniqueQualifiedLeadIds.includes(l.id))
      .reduce((sum, l) => sum + Number(l.deal_value || 0), 0)

    return NextResponse.json({
      bestCase: formatK(bestCaseValue),
      commit: formatK(commitForecastValue),
      likelySlip: formatK(likelySlipValue),
      bestCaseRaw: bestCaseValue,
      commitRaw: commitForecastValue,
      likelySlipRaw: likelySlipValue,
      activeOpportunitiesCount: bestCaseLeads.length,
      slippingDealsCount: likelySlipLeads.length,
      confidence,
      commitIndicator,
      newlyQualifiedValue
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    )
  }
}
