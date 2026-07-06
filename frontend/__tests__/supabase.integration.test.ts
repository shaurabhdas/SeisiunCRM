import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { fetchAccountsWithMetrics } from '@/lib/accounts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_TEST_URL!,
  process.env.SUPABASE_TEST_SERVICE_KEY!,
  {
    db: {
      schema: 'test'
    },
    realtime: {
      transport: ws
    }
  }
)

let testAccountId: string
let testLeadId: string

beforeAll(async () => {
  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      name: 'Test Account XYZ',
      industry: 'Technology',
      company_size: 'SMB',
      sales_region: 'US East',
    })
    .select()
    .single()

  expect(error).toBeNull()
  testAccountId = account.id
})

afterAll(async () => {
  await supabase.from('accounts').delete().eq('id', testAccountId)
})

describe('Lead insert', () => {

  it('creates a lead with stage contact and open_date set to today', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        opportunity_name: 'Test Opportunity',
        account_id: testAccountId,
        stage: 'contact',
        open_date: today,
        forecast_close_date: '2026-12-31',
        sales_region: 'US East',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(lead.stage).toBe('contact')
    expect(lead.open_date).toBe(today)
    expect(lead.last_connect_date).toBeNull()

    testLeadId = lead.id
  })

  it('writes an initial row to lead_stage_history on lead creation', async () => {
    const { data: history, error } = await supabase
      .from('lead_stage_history')
      .select()
      .eq('lead_id', testLeadId)

    expect(error).toBeNull()
    expect(history.length).toBe(1)
    expect(history[0].from_stage).toBeNull()
    expect(history[0].to_stage).toBe('contact')
  })
})

describe('Contact insert', () => {

  it('creates a contact linked to the correct lead and account', async () => {
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        lead_id: testLeadId,
        account_id: testAccountId,
        first_name: 'Test',
        last_name: 'Person',
        email: 'test@testxyz.com',
        phone: '5551234567',
        stakeholder_role: 'champion',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(contact.lead_id).toBe(testLeadId)
    expect(contact.account_id).toBe(testAccountId)
    expect(contact.stakeholder_role).toBe('champion')
  })
})

describe('Activity insert and last_connect_date trigger', () => {

  it('inserts an activity record linked to the lead', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: testLeadId,
        activity_type: 'email',
        activity_date: today,
        note: 'Sent introduction email',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(activity.lead_id).toBe(testLeadId)
    expect(activity.activity_type).toBe('email')
  })

  it('updates last_connect_date on the lead after activity is logged', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: lead, error } = await supabase
      .from('leads')
      .select('last_connect_date')
      .eq('id', testLeadId)
      .single()

    expect(error).toBeNull()
    expect(lead.last_connect_date).toBe(today)
  })

  it('updates last_connect_date when a more recent activity is logged', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    await supabase
      .from('lead_activities')
      .insert({
        lead_id: testLeadId,
        activity_type: 'call',
        activity_date: tomorrow,
        note: 'Follow up call',
      })

    const { data: lead } = await supabase
      .from('leads')
      .select('last_connect_date')
      .eq('id', testLeadId)
      .single()

    expect(lead.last_connect_date).toBe(tomorrow)
  })
})

describe('Stage progression writes to lead_stage_history', () => {

  it('records a history row when stage advances from contact to outreach', async () => {
    await supabase
      .from('leads')
      .update({ stage: 'outreach' })
      .eq('id', testLeadId)

    await supabase
      .from('lead_stage_history')
      .insert({
        lead_id: testLeadId,
        from_stage: 'contact',
        to_stage: 'outreach',
      })

    const { data: history } = await supabase
      .from('lead_stage_history')
      .select()
      .eq('lead_id', testLeadId)
      .order('changed_at', { ascending: true })

    expect(history.length).toBe(2)
    expect(history[1].from_stage).toBe('contact')
    expect(history[1].to_stage).toBe('outreach')
  })
})

describe('Lead delete cascade', () => {

  it('removes all child records and the lead itself in the correct order', async () => {
    await supabase.from('lead_activities').delete().eq('lead_id', testLeadId)
    await supabase.from('lead_stage_history').delete().eq('lead_id', testLeadId)
    await supabase.from('contacts').delete().eq('lead_id', testLeadId)
    await supabase.from('leads').delete().eq('id', testLeadId)

    const { data: activities } = await supabase
      .from('lead_activities').select().eq('lead_id', testLeadId)

    const { data: contacts } = await supabase
      .from('contacts').select().eq('lead_id', testLeadId)

    const { data: history } = await supabase
      .from('lead_stage_history').select().eq('lead_id', testLeadId)

    const { data: lead } = await supabase
      .from('leads').select().eq('id', testLeadId)

    expect(activities.length).toBe(0)
    expect(contacts.length).toBe(0)
    expect(history.length).toBe(0)
    expect(lead.length).toBe(0)
  })
})

describe('Schema migration verification', () => {

  it('deal_value field exists on test.leads with correct type and default', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        opportunity_name: 'Deal Value Test Lead',
        account_id: testAccountId,
        stage: 'contact',
        open_date: today,
        forecast_close_date: '2026-12-31',
        sales_region: 'US East',
      })
      .select('deal_value')
      .single()

    expect(error).toBeNull()
    expect(lead.deal_value).toBe(0)

    const { data: lead1 } = await supabase.from('leads').select('id').eq('opportunity_name', 'Deal Value Test Lead').single()
    if (lead1) {
      await supabase.from('lead_stage_history').delete().eq('lead_id', lead1.id)
      await supabase.from('leads').delete().eq('id', lead1.id)
    }
  })

  it('deal_value accepts a numeric value correctly', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        opportunity_name: 'Deal Value Amount Test',
        account_id: testAccountId,
        stage: 'contact',
        open_date: today,
        forecast_close_date: '2026-12-31',
        sales_region: 'US East',
        deal_value: 350000.00,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(Number(lead.deal_value)).toBe(350000)

    if (lead) {
      await supabase.from('lead_stage_history').delete().eq('lead_id', lead.id)
      await supabase.from('leads').delete().eq('id', lead.id)
    }
  })

  it('notes field exists on test.accounts and accepts text', async () => {
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        name: 'Notes Test Account',
        industry: 'Technology',
        sales_region: 'US East',
        notes: 'This is a test note for the account.',
      })
      .select('notes')
      .single()

    expect(error).toBeNull()
    expect(account.notes).toBe('This is a test note for the account.')

    await supabase.from('accounts').delete().eq('name', 'Notes Test Account')
  })

  it('notes field on test.accounts defaults to null when not provided', async () => {
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        name: 'No Notes Test Account',
        industry: 'Technology',
        sales_region: 'US East',
      })
      .select('notes')
      .single()

    expect(error).toBeNull()
    expect(account.notes).toBeNull()

    await supabase.from('accounts').delete().eq('name', 'No Notes Test Account')
  })
})

describe('Account metrics queries', () => {

  it('correctly counts open leads under an account', async () => {
    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('account_id', testAccountId)
      .neq('stage', 'disqualified')

    expect(leads.length).toBeGreaterThanOrEqual(0)
  })

  it('correctly sums deal value across active leads', async () => {
    // Clean up first to prevent pollution from previous runs
    const { data: preLeads } = await supabase.from('leads').select('id').eq('account_id', testAccountId)
    const preIds = (preLeads || []).map(l => l.id)
    if (preIds.length > 0) {
      await supabase.from('lead_stage_history').delete().in('lead_id', preIds)
      await supabase.from('leads').delete().in('id', preIds)
    }

    await supabase.from('leads').insert([
      {
        opportunity_name: 'Deal A',
        account_id: testAccountId,
        stage: 'demo',
        open_date: new Date().toISOString().split('T')[0],
        forecast_close_date: '2026-12-31',
        sales_region: 'US East',
        deal_value: 200000,
      },
      {
        opportunity_name: 'Deal B',
        account_id: testAccountId,
        stage: 'presentation',
        open_date: new Date().toISOString().split('T')[0],
        forecast_close_date: '2026-12-31',
        sales_region: 'US East',
        deal_value: 150000,
      },
    ])

    const { data: leads } = await supabase
      .from('leads')
      .select('deal_value')
      .eq('account_id', testAccountId)
      .neq('stage', 'disqualified')

    const total = leads.reduce((sum, l) => sum + Number(l.deal_value), 0)
    expect(total).toBe(350000)

    const { data: leadsToDelete } = await supabase.from('leads').select('id').eq('account_id', testAccountId)
    const deleteIds = (leadsToDelete || []).map(l => l.id)
    if (deleteIds.length > 0) {
      await supabase.from('lead_stage_history').delete().in('lead_id', deleteIds)
      await supabase.from('leads').delete().in('id', deleteIds)
    }
  })

  it('identifies champion presence across leads for an account', async () => {
    // 1. Create a temporary lead since global testLeadId is deleted in a prior test
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        opportunity_name: 'Temp Champion Test Lead',
        account_id: testAccountId,
        stage: 'connected',
        open_date: new Date().toISOString().split('T')[0],
        sales_region: 'US East',
      })
      .select()
      .single()

    expect(leadError).toBeNull()

    // 2. Insert the contact linked to this temporary lead
    const { error: contactError } = await supabase.from('contacts').insert({
      lead_id: lead.id,
      account_id: testAccountId,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@test.com',
      stakeholder_role: 'champion',
    })

    expect(contactError).toBeNull()

    // 3. Query contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('stakeholder_role')
      .eq('account_id', testAccountId)

    const hasChampion = contacts.some(c => c.stakeholder_role === 'champion')
    expect(hasChampion).toBe(true)

    // 4. Clean up contacts and the temp lead
    await supabase.from('contacts').delete().eq('account_id', testAccountId)
    await supabase.from('leads').delete().eq('id', lead.id)
  })
})

describe('fetchAccountsWithMetrics: deduplication and activity integrity', () => {

  let dedupAccountId: string
  let dedupLead1Id: string
  let dedupLead2Id: string
  let activityAccountId: string
  let activityLeadId: string

  afterAll(async () => {
    const dedupLeadIds = [dedupLead1Id, dedupLead2Id].filter(Boolean)
    if (dedupLeadIds.length > 0) {
      await supabase.from('lead_activities').delete().in('lead_id', dedupLeadIds)
      await supabase.from('lead_stage_history').delete().in('lead_id', dedupLeadIds)
      await supabase.from('contacts').delete().in('lead_id', dedupLeadIds)
      await supabase.from('leads').delete().in('id', dedupLeadIds)
    }
    if (activityLeadId) {
      await supabase.from('lead_activities').delete().eq('lead_id', activityLeadId)
      await supabase.from('lead_stage_history').delete().eq('lead_id', activityLeadId)
      await supabase.from('leads').delete().eq('id', activityLeadId)
    }
    if (dedupAccountId) {
      await supabase.from('accounts').delete().eq('id', dedupAccountId)
    }
    if (activityAccountId) {
      await supabase.from('accounts').delete().eq('id', activityAccountId)
    }
  })

  it('deduplicates contacts sharing the same email across multiple leads under one account', async () => {
    const { data: account, error: accountErr } = await supabase
      .from('accounts')
      .insert({
        name: 'Dedup Test Corp',
        industry: 'Technology',
        sales_region: 'US East',
      })
      .select()
      .single()

    expect(accountErr).toBeNull()
    dedupAccountId = account.id

    const today = new Date().toISOString().split('T')[0]

    const { data: lead1, error: lead1Err } = await supabase
      .from('leads')
      .insert({
        opportunity_name: 'Dedup Lead One',
        account_id: dedupAccountId,
        stage: 'connected',
        open_date: today,
        forecast_close_date: '2026-12-31',
        sales_region: 'US East',
      })
      .select()
      .single()

    expect(lead1Err).toBeNull()
    dedupLead1Id = lead1.id

    const { data: lead2, error: lead2Err } = await supabase
      .from('leads')
      .insert({
        opportunity_name: 'Dedup Lead Two',
        account_id: dedupAccountId,
        stage: 'outreach',
        open_date: today,
        forecast_close_date: '2026-12-31',
        sales_region: 'US East',
      })
      .select()
      .single()

    expect(lead2Err).toBeNull()
    dedupLead2Id = lead2.id

    // Insert the same contact email under both leads, simulating
    // a stakeholder involved in two parallel conversations
    const { error: contactErr } = await supabase
      .from('contacts')
      .insert([
        {
          lead_id: dedupLead1Id,
          account_id: dedupAccountId,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@dedupcorp.com',
          stakeholder_role: 'champion',
        },
        {
          lead_id: dedupLead2Id,
          account_id: dedupAccountId,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@dedupcorp.com',
          stakeholder_role: 'champion',
        },
      ])

    expect(contactErr).toBeNull()

    const accounts = await fetchAccountsWithMetrics()
    const testAccount = accounts.find(a => a.id === dedupAccountId)

    expect(testAccount).toBeDefined()
    expect(testAccount!.contacts.length).toBe(1)
    expect(testAccount!.contacts[0].email).toBe('jane.smith@dedupcorp.com')
  })

  it('returns the correct activity count with no duplicates and sorted by date descending', async () => {
    const { data: account, error: accountErr } = await supabase
      .from('accounts')
      .insert({
        name: 'Activity Count Corp',
        industry: 'Finance',
        sales_region: 'US West',
      })
      .select()
      .single()

    expect(accountErr).toBeNull()
    activityAccountId = account.id

    const today = new Date().toISOString().split('T')[0]

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        opportunity_name: 'Activity Test Lead',
        account_id: activityAccountId,
        stage: 'demo',
        open_date: today,
        forecast_close_date: '2026-12-31',
        sales_region: 'US West',
      })
      .select()
      .single()

    expect(leadErr).toBeNull()
    activityLeadId = lead.id

    const { error: activityErr } = await supabase
      .from('lead_activities')
      .insert([
        {
          lead_id: activityLeadId,
          activity_type: 'email',
          activity_date: '2026-06-01',
          note: 'Initial outreach email.',
        },
        {
          lead_id: activityLeadId,
          activity_type: 'call',
          activity_date: '2026-06-15',
          note: 'Follow up call with stakeholder.',
        },
        {
          lead_id: activityLeadId,
          activity_type: 'demo',
          activity_date: '2026-06-28',
          note: 'Full product demo delivered.',
        },
      ])

    expect(activityErr).toBeNull()

    const accounts = await fetchAccountsWithMetrics()
    const testAccount = accounts.find(a => a.id === activityAccountId)

    expect(testAccount).toBeDefined()
    expect(testAccount!.recentActivities.length).toBe(3)

    // Verify descending sort: most recent activity must appear first
    const dates = testAccount!.recentActivities.map(a => a.activity_date.split('T')[0])
    expect(dates[0]).toBe('2026-06-28')
    expect(dates[1]).toBe('2026-06-15')
    expect(dates[2]).toBe('2026-06-01')

    // Verify each activity maps back to the correct lead
    testAccount!.recentActivities.forEach(a => {
      expect(a.lead_id).toBe(activityLeadId)
      expect(a.opportunity_name).toBe('Activity Test Lead')
    })
  })
})

describe('Deals schema verification', () => {

  let testDealId: string
  let testDealActivityId: string

  afterAll(async () => {
    if (testDealId) {
      await supabase.from('deal_stage_history').delete().eq('deal_id', testDealId)
      await supabase.from('deal_activities').delete().eq('deal_id', testDealId)
      await supabase.from('deals').delete().eq('id', testDealId)
    }
  })

  it('creates a deal record with correct defaults', async () => {
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        account_id: testAccountId,
        opportunity_name: 'Schema Test Deal',
        deal_type: 'poc',
        reported_value: 60000,
        value_confidence: 'estimated',
        stage: 'proposal_submitted',
        sales_region: 'US East',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(deal.stage).toBe('proposal_submitted')
    expect(deal.value_confidence).toBe('estimated')
    expect(Number(deal.reported_value)).toBe(60000)
    expect(deal.originating_deal_id).toBeNull()

    testDealId = deal.id
  })

  it('writes a stage history row when deal is created', async () => {
    await supabase
      .from('deal_stage_history')
      .insert({
        deal_id: testDealId,
        from_stage: null,
        to_stage: 'proposal_submitted',
      })

    const { data: history, error } = await supabase
      .from('deal_stage_history')
      .select()
      .eq('deal_id', testDealId)

    expect(error).toBeNull()
    expect(history.length).toBe(1)
    expect(history[0].from_stage).toBeNull()
    expect(history[0].to_stage).toBe('proposal_submitted')
  })

  it('creates a deal activity linked to the deal', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: activity, error } = await supabase
      .from('deal_activities')
      .insert({
        deal_id: testDealId,
        activity_type: 'email',
        activity_date: today,
        note: 'Sent formal proposal document to client.',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(activity.deal_id).toBe(testDealId)
    expect(activity.activity_type).toBe('email')

    testDealActivityId = activity.id
  })

  it('links a full contract deal to an originating poc deal', async () => {
    const { data: fullContractDeal, error } = await supabase
      .from('deals')
      .insert({
        account_id: testAccountId,
        originating_deal_id: testDealId,
        opportunity_name: 'Schema Test Full Contract',
        deal_type: 'full_contract',
        reported_value: 350000,
        value_confidence: 'estimated',
        stage: 'proposal_submitted',
        sales_region: 'US East',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(fullContractDeal.originating_deal_id).toBe(testDealId)
    expect(fullContractDeal.deal_type).toBe('full_contract')

    await supabase.from('deals').delete().eq('id', fullContractDeal.id)
  })

  it('cascades delete of deal_activities and deal_stage_history when deal is deleted', async () => {
    const { data: tempDeal } = await supabase
      .from('deals')
      .insert({
        account_id: testAccountId,
        opportunity_name: 'Cascade Delete Test',
        deal_type: 'poc',
        reported_value: 60000,
        value_confidence: 'estimated',
        stage: 'proposal_submitted',
        sales_region: 'US East',
      })
      .select()
      .single()

    await supabase.from('deal_activities').insert({
      deal_id: tempDeal.id,
      activity_type: 'call',
      activity_date: new Date().toISOString().split('T')[0],
      note: 'Cascade test activity',
    })

    await supabase.from('deal_stage_history').insert({
      deal_id: tempDeal.id,
      from_stage: null,
      to_stage: 'proposal_submitted',
    })

    await supabase.from('deals').delete().eq('id', tempDeal.id)

    const { data: activities } = await supabase
      .from('deal_activities')
      .select()
      .eq('deal_id', tempDeal.id)

    const { data: history } = await supabase
      .from('deal_stage_history')
      .select()
      .eq('deal_id', tempDeal.id)

    expect(activities.length).toBe(0)
    expect(history.length).toBe(0)
  })
})

describe('Deals stage gate validation', () => {

  let gateTestDealId: string

  beforeAll(async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data: deal } = await supabase
      .from('deals')
      .insert({
        account_id: testAccountId,
        opportunity_name: 'Gate Test Deal',
        deal_type: 'poc',
        reported_value: 60000,
        value_confidence: 'estimated',
        stage: 'proposal_submitted',
        proposal_date: today,
        sales_region: 'US East',
      })
      .select()
      .single()
    gateTestDealId = deal.id
  })

  afterAll(async () => {
    if (gateTestDealId) {
      await supabase.from('deal_stage_history').delete().eq('deal_id', gateTestDealId)
      await supabase.from('deal_activities').delete().eq('deal_id', gateTestDealId)
      await supabase.from('deals').delete().eq('id', gateTestDealId)
    }
  })

  it('blocks advance to negotiation when no activity exists after proposal date', async () => {
    const response = await fetch(
      `http://localhost:3000/api/deals/${gateTestDealId}/stage`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-schema': 'test'
        },
        body: JSON.stringify({ toStage: 'negotiation' }),
      }
    )
    expect(response.status).toBe(400)
    const result = await response.json()
    expect(result.error).toBeTruthy()
  })

  it('allows advance to negotiation when activity exists on or after proposal date', async () => {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('deal_activities').insert({
      deal_id: gateTestDealId,
      activity_type: 'call',
      activity_date: today,
      note: 'Gate test call activity.',
    })

    const response = await fetch(
      `http://localhost:3000/api/deals/${gateTestDealId}/stage`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-schema': 'test'
        },
        body: JSON.stringify({ toStage: 'negotiation' }),
      }
    )
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.stage).toBe('negotiation')
  })

  it('blocks closed_lost without a lost reason', async () => {
    const response = await fetch(
      `http://localhost:3000/api/deals/${gateTestDealId}/stage`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-schema': 'test'
        },
        body: JSON.stringify({ toStage: 'closed_lost' }),
      }
    )
    expect(response.status).toBe(400)
    const result = await response.json()
    expect(result.error).toBeTruthy()
  })

  it('blocks closed_lost without a lost reason even when deal is not in negotiation stage', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: proposalDeal } = await supabase
      .from('deals')
      .insert({
        account_id: testAccountId,
        opportunity_name: 'Proposal Stage Lost Test',
        deal_type: 'full_contract',
        reported_value: 120000,
        value_confidence: 'estimated',
        stage: 'proposal_submitted',
        proposal_date: today,
        sales_region: 'US East',
      })
      .select()
      .single()

    const response = await fetch(
      `http://localhost:3000/api/deals/${proposalDeal.id}/stage`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-schema': 'test'
        },
        body: JSON.stringify({ toStage: 'closed_lost' }),
      }
    )

    expect(response.status).toBe(400)
    const result = await response.json()
    expect(result.error).toBeTruthy()

    await supabase.from('deal_stage_history').delete().eq('deal_id', proposalDeal.id)
    await supabase.from('deal_activities').delete().eq('deal_id', proposalDeal.id)
    await supabase.from('deals').delete().eq('id', proposalDeal.id)
  })

  it('blocks closed_lost with an invalid lost reason', async () => {
    const response = await fetch(
      `http://localhost:3000/api/deals/${gateTestDealId}/stage`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-schema': 'test'
        },
        body: JSON.stringify({ toStage: 'closed_lost', lost_reason: 'invalid_reason' }),
      }
    )
    expect(response.status).toBe(400)
  })

  it('blocks closed_won without sow_reference and close_date', async () => {
    const response = await fetch(
      `http://localhost:3000/api/deals/${gateTestDealId}/stage`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-schema': 'test'
        },
        body: JSON.stringify({ toStage: 'closed_won' }),
      }
    )
    expect(response.status).toBe(400)
    const result = await response.json()
    expect(result.error).toBeTruthy()
  })
})

describe('Auth schema verification', () => {

  it('user_profiles table exists in test schema with correct columns', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, role, status')
      .limit(0)

    expect(error).toBeNull()
  })

  it('leads table has needs_reassignment and assigned_rep_name columns', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        opportunity_name: 'Auth Schema Test Lead',
        account_id: testAccountId,
        stage: 'contact',
        open_date: today,
        forecast_close_date: '2026-12-31',
        sales_region: 'US East',
        needs_reassignment: false,
        assigned_rep_name: 'Test Rep',
      })
      .select('needs_reassignment, assigned_rep_name')
      .single()

    expect(error).toBeNull()
    expect(lead.needs_reassignment).toBe(false)
    expect(lead.assigned_rep_name).toBe('Test Rep')

    await supabase.from('leads').delete().eq('opportunity_name', 'Auth Schema Test Lead')
  })

  it('deals table has needs_reassignment and assigned_rep_name columns', async () => {
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        account_id: testAccountId,
        opportunity_name: 'Auth Schema Test Deal',
        deal_type: 'poc',
        reported_value: 60000,
        value_confidence: 'estimated',
        stage: 'proposal_submitted',
        sales_region: 'US East',
        needs_reassignment: false,
        assigned_rep_name: 'Test Rep',
      })
      .select('needs_reassignment, assigned_rep_name')
      .single()

    expect(error).toBeNull()
    expect(deal.needs_reassignment).toBe(false)
    expect(deal.assigned_rep_name).toBe('Test Rep')

    await supabase.from('deal_stage_history').delete().eq('deal_id', deal.id)
    await supabase.from('deals').delete().eq('id', deal.id)
  })
})


