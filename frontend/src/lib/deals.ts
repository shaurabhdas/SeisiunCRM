import { supabase } from './accounts'

export type Deal = {
  id: string
  account_id: string | null
  lead_id: string | null
  originating_deal_id: string | null
  opportunity_name: string
  deal_type: 'poc' | 'full_contract'
  stage: 'proposal_submitted' | 'negotiation' | 'closed_won' | 'closed_lost' | 'on_hold'
  reported_value: number
  potential_full_contract_value: number | null
  value_confidence: 'confirmed' | 'estimated'
  sow_reference: string | null
  proposal_date: string | null
  close_date: string | null
  forecast_close_date: string | null
  lost_reason: string | null
  on_hold_resume_date: string | null
  sales_region: string | null
  competitor: string | null
  notes: string | null
  created_at: string
  account?: { name: string; industry: string | null }
  lead?: { opportunity_name: string; stage: string }
  originating_deal?: { opportunity_name: string; deal_type: string }
  activities?: DealActivity[]
  stage_history?: DealStageHistory[]
}

export type DealActivity = {
  id: string
  deal_id: string
  activity_type: string
  activity_date: string
  note: string | null
  created_at: string
}

export type DealStageHistory = {
  id: string
  deal_id: string
  from_stage: string | null
  to_stage: string
  changed_at: string
}

export async function fetchDeals(): Promise<Deal[]> {
  // Fetch deals
  const { data: dealsData, error: dealsErr } = await supabase
    .from('deals')
    .select('*')
  if (dealsErr) throw dealsErr

  const deals = (dealsData || []) as Deal[]
  if (deals.length === 0) return []

  const dealIds = deals.map(d => d.id)

  // Fetch accounts
  const accountIds = Array.from(new Set(deals.map(d => d.account_id).filter(Boolean))) as string[]
  let accounts: any[] = []
  if (accountIds.length > 0) {
    const { data: accData, error: accErr } = await supabase
      .from('accounts')
      .select('id, name, industry')
      .in('id', accountIds)
    if (accErr) throw accErr
    accounts = accData || []
  }
  const accountMap = new Map(accounts.map(a => [a.id, a]))

  // Fetch leads
  const leadIds = Array.from(new Set(deals.map(d => d.lead_id).filter(Boolean))) as string[]
  let leads: any[] = []
  if (leadIds.length > 0) {
    const { data: leadData, error: leadErr } = await supabase
      .from('leads')
      .select('id, opportunity_name, stage')
      .in('id', leadIds)
    if (leadErr) throw leadErr
    leads = leadData || []
  }
  const leadMap = new Map(leads.map(l => [l.id, l]))

  // Fetch originating deals metadata
  const origIds = Array.from(new Set(deals.map(d => d.originating_deal_id).filter(Boolean))) as string[]
  let origDeals: any[] = []
  if (origIds.length > 0) {
    const { data: origData, error: origErr } = await supabase
      .from('deals')
      .select('id, opportunity_name, deal_type')
      .in('id', origIds)
    if (origErr) throw origErr
    origDeals = origData || []
  }
  const origMap = new Map(origDeals.map(d => [d.id, d]))

  // Fetch activities (ordered by activity_date desc)
  const { data: actData, error: actErr } = await supabase
    .from('deal_activities')
    .select('*')
    .in('deal_id', dealIds)
    .order('activity_date', { ascending: false })
  if (actErr) throw actErr
  const activities = (actData || []) as DealActivity[]

  // Fetch stage history (ordered by changed_at desc)
  const { data: histData, error: histErr } = await supabase
    .from('deal_stage_history')
    .select('*')
    .in('deal_id', dealIds)
    .order('changed_at', { ascending: false })
  if (histErr) throw histErr
  const history = (histData || []) as DealStageHistory[]

  // Merge client-side to prevent duplicates
  return deals.map(deal => {
    return {
      ...deal,
      account: deal.account_id ? accountMap.get(deal.account_id) : undefined,
      lead: deal.lead_id ? leadMap.get(deal.lead_id) : undefined,
      originating_deal: deal.originating_deal_id ? origMap.get(deal.originating_deal_id) : undefined,
      activities: activities.filter(a => a.deal_id === deal.id),
      stage_history: history.filter(h => h.deal_id === deal.id)
    }
  })
}

export async function createDeal(payload: Partial<Deal>): Promise<Deal> {
  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      ...payload,
      stage: payload.stage || 'proposal_submitted'
    })
    .select()
    .single()
  if (error) throw error

  // Insert initial stage history row
  const { error: histErr } = await supabase
    .from('deal_stage_history')
    .insert({
      deal_id: deal.id,
      from_stage: null,
      to_stage: deal.stage
    })
  if (histErr) throw histErr

  // If a lead_id was linked, update that lead to point to this deal
  if (payload.lead_id) {
    const { error: leadErr } = await supabase
      .from('leads')
      .update({ deal_id: deal.id })
      .eq('id', payload.lead_id)
    if (leadErr) throw leadErr
  }

  return deal as Deal
}

export async function updateDealStage(
  dealId: string,
  newStage: 'proposal_submitted' | 'negotiation' | 'closed_won' | 'closed_lost' | 'on_hold',
  options: {
    lost_reason?: string | null
    on_hold_resume_date?: string | null
    close_date?: string | null
    sow_reference?: string | null
  } = {}
): Promise<{ deal: Deal; showConversionPrompt: boolean }> {
  // Get current deal stage
  const { data: currentDeal, error: getErr } = await supabase
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .single()
  if (getErr) throw getErr

  const fromStage = currentDeal.stage

  // Update deals stage & options fields
  const updatePayload: any = { stage: newStage }
  if (newStage === 'closed_lost') {
    updatePayload.lost_reason = options.lost_reason || null
  } else if (newStage === 'on_hold') {
    updatePayload.on_hold_resume_date = options.on_hold_resume_date || null
  } else if (newStage === 'closed_won') {
    updatePayload.close_date = options.close_date || new Date().toISOString().split('T')[0]
    updatePayload.sow_reference = options.sow_reference || null
  }

  const { data: updatedDeal, error: updateErr } = await supabase
    .from('deals')
    .update(updatePayload)
    .eq('id', dealId)
    .select()
    .single()
  if (updateErr) throw updateErr

  // Insert stage history transition
  const { error: histErr } = await supabase
    .from('deal_stage_history')
    .insert({
      deal_id: dealId,
      from_stage: fromStage,
      to_stage: newStage
    })
  if (histErr) throw histErr

  const showConversionPrompt = newStage === 'closed_won' && currentDeal.deal_type === 'poc'

  return {
    deal: updatedDeal as Deal,
    showConversionPrompt
  }
}

export async function logDealActivity(
  dealId: string,
  activityType: string,
  activityDate: string,
  note: string | null
): Promise<DealActivity> {
  const { data: activity, error } = await supabase
    .from('deal_activities')
    .insert({
      deal_id: dealId,
      activity_type: activityType,
      activity_date: activityDate,
      note
    })
    .select()
    .single()
  if (error) throw error

  return activity as DealActivity
}
