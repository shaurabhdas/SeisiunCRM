import { createClient } from '@supabase/supabase-js'
import { calculateDaysSinceContact } from './followup'

// Schema environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_TEST_URL || 'https://jdbgqlueshcyjvuoxpcr.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_TEST_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYmdxbHVlc2hjeWp2dW94cGNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzE5MDk3NCwiZXhwIjoyMDk4NzY2OTc0fQ.4C6RVCLFT12-FfwwGxuB4tMOtHs6F0YgziPUGGqDa8I'
const supabaseSchema = process.env.SUPABASE_DB_SCHEMA || process.env.SUPABASE_TEST_SCHEMA || 'public'

const isTest = typeof window === 'undefined' && process.env.NODE_ENV === 'test'
let ws: any = null
if (isTest) {
  try {
    ws = require('ws')
  } catch (e) {
    // ignore
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: supabaseSchema
  },
  ...(ws ? { realtime: { transport: ws } } : {})
})

export type AccountWithMetrics = {
  id: string
  name: string
  industry: string | null
  company_size: string | null
  sales_region: string | null
  notes: string | null
  openLeadsCount: number
  totalDealValue: number
  lastActivityDays: number | null
  furthestStage: string | null
  hasChampion: boolean
  hasEconomicBuyer: boolean
  hasLeadAtConnectedOrBeyond: boolean
  leads: LeadSummary[]
  contacts: ContactSummary[]
  recentActivities: ActivitySummary[]
}

export type LeadSummary = {
  id: string
  opportunity_name: string
  stage: string
  last_connect_date: string | null
  deal_value: number
  forecast_close_date: string | null
}

export type ContactSummary = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  stakeholder_role: string | null
  lead_id: string
}

export type ActivitySummary = {
  id: string
  activity_type: string
  activity_date: string
  note: string | null
  lead_id: string
  opportunity_name: string
}

const STAGE_DEPTHS: Record<string, number> = {
  contact: 1,
  outreach: 2,
  connected: 3,
  presentation: 4,
  demo: 5,
  evaluating: 6,
}

export async function fetchAccountsWithMetrics(): Promise<AccountWithMetrics[]> {
  // 1. Fetch all accounts
  const { data: accounts, error: accountsErr } = await supabase
    .from('accounts')
    .select('id, name, industry, company_size, sales_region, notes')

  if (accountsErr) throw accountsErr
  if (!accounts) return []

  // 2. Fetch all leads
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('id, opportunity_name, stage, last_connect_date, deal_value, forecast_close_date, account_id')

  if (leadsErr) throw leadsErr
  const allLeads = leads || []

  // Get all lead IDs
  const leadIds = allLeads.map((l: any) => l.id)

  // 3. Fetch all contacts where lead_id is in leadIds
  let contacts: any[] = []
  if (leadIds.length > 0) {
    const { data: contactsData, error: contactsErr } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, stakeholder_role, lead_id, account_id')
      .in('lead_id', leadIds)
    if (contactsErr) throw contactsErr
    contacts = contactsData || []
  }

  // 4. Fetch all activities where lead_id is in leadIds ordered by activity_date descending
  let activities: any[] = []
  if (leadIds.length > 0) {
    const { data: activitiesData, error: activitiesErr } = await supabase
      .from('lead_activities')
      .select('id, activity_type, activity_date, note, lead_id')
      .in('lead_id', leadIds)
      .order('activity_date', { ascending: false })
    if (activitiesErr) throw activitiesErr
    activities = activitiesData || []
  }

  // Map of leads by ID for fast lookup
  const leadMap = new Map<string, any>()
  allLeads.forEach((l: any) => leadMap.set(l.id, l))

  return accounts.map((account: any) => {
    // Leads for this account
    const accountLeads = allLeads.filter((l: any) => l.account_id === account.id)
    const accountLeadIds = accountLeads.map((l: any) => l.id)

    // Contacts for this account
    const rawAccountContacts = contacts.filter((c: any) => c.account_id === account.id || (c.lead_id && accountLeadIds.includes(c.lead_id)))

    // Deduplicate contacts by email address (case-insensitive, keeping first occurrence)
    const seenEmails = new Set<string>()
    const contactSummaries: ContactSummary[] = []
    
    rawAccountContacts.forEach((c: any) => {
      const emailLower = c.email ? c.email.trim().toLowerCase() : ''
      if (emailLower) {
        if (!seenEmails.has(emailLower)) {
          seenEmails.add(emailLower)
          contactSummaries.push({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            phone: c.phone,
            stakeholder_role: c.stakeholder_role,
            lead_id: c.lead_id
          })
        }
      } else {
        // If no email, always include
        contactSummaries.push({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          phone: c.phone,
          stakeholder_role: c.stakeholder_role,
          lead_id: c.lead_id
        })
      }
    })

    // Activities for this account (already ordered by activity_date desc globally/regionally)
    const accountActivities = activities.filter((act: any) => act.lead_id && accountLeadIds.includes(act.lead_id))
    
    // Deduplicate activities by activity ID to be absolutely safe
    const seenActivityIds = new Set<string>()
    const recentActivities: ActivitySummary[] = []
    
    accountActivities.forEach((act: any) => {
      if (!seenActivityIds.has(act.id)) {
        seenActivityIds.add(act.id)
        const lead = leadMap.get(act.lead_id)
        recentActivities.push({
          id: act.id,
          activity_type: act.activity_type,
          activity_date: act.activity_date,
          note: act.note,
          lead_id: act.lead_id,
          opportunity_name: lead ? lead.opportunity_name : 'Unknown Opportunity'
        })
      }
    })

    // Sort recent activities descending
    recentActivities.sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())

    // Calculate metrics
    const activeLeads = accountLeads.filter((l: any) => l.stage !== 'disqualified')
    const openLeadsCount = activeLeads.length
    const totalDealValue = activeLeads.reduce((sum: number, l: any) => sum + Number(l.deal_value || 0), 0)

    // Last activity days
    let minDays: number | null = null
    accountLeads.forEach((l: any) => {
      if (l.last_connect_date) {
        const days = calculateDaysSinceContact(l.last_connect_date)
        if (days !== null) {
          if (minDays === null || days < minDays) {
            minDays = days
          }
        }
      }
    })

    // Furthest stage
    let furthestStage: string | null = null
    let maxDepth = -1
    activeLeads.forEach((l: any) => {
      const stageLower = l.stage.toLowerCase()
      const depth = STAGE_DEPTHS[stageLower] || 0
      if (depth > maxDepth) {
        maxDepth = depth
        furthestStage = l.stage
      }
    })

    const hasChampion = contactSummaries.some((c: any) => c.stakeholder_role === 'champion')
    const hasEconomicBuyer = contactSummaries.some((c: any) => c.stakeholder_role === 'economic_buyer')

    const hasLeadAtConnectedOrBeyond = activeLeads.some((l: any) =>
      ['connected', 'presentation', 'demo', 'evaluating'].includes(l.stage.toLowerCase())
    )

    const leads: LeadSummary[] = accountLeads.map((l: any) => ({
      id: l.id,
      opportunity_name: l.opportunity_name,
      stage: l.stage,
      last_connect_date: l.last_connect_date,
      deal_value: Number(l.deal_value || 0),
      forecast_close_date: l.forecast_close_date
    }))

    return {
      id: account.id,
      name: account.name,
      industry: account.industry,
      company_size: account.company_size,
      sales_region: account.sales_region,
      notes: account.notes,
      openLeadsCount,
      totalDealValue,
      lastActivityDays: minDays,
      furthestStage,
      hasChampion,
      hasEconomicBuyer,
      hasLeadAtConnectedOrBeyond,
      leads,
      contacts: contactSummaries,
      recentActivities
    }
  })
}
