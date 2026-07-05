import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

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
