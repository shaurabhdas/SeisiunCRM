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
  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id,
      name,
      industry,
      company_size,
      sales_region,
      notes,
      leads (
        id,
        opportunity_name,
        stage,
        last_connect_date,
        deal_value,
        forecast_close_date,
        lead_activities (
          id,
          activity_type,
          activity_date,
          note
        )
      ),
      contacts (
        id,
        first_name,
        last_name,
        email,
        phone,
        stakeholder_role,
        lead_id
      )
    `)

  if (error) {
    throw error
  }

  if (!data) return []

  return data.map((account: any) => {
    const rawLeads = account.leads || []
    const contacts = account.contacts || []

    const activeLeads = rawLeads.filter((l: any) => l.stage !== 'disqualified')
    const openLeadsCount = activeLeads.length
    const totalDealValue = activeLeads.reduce((sum: number, l: any) => sum + Number(l.deal_value || 0), 0)

    // Last activity days
    let minDays: number | null = null
    rawLeads.forEach((l: any) => {
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

    const hasChampion = contacts.some((c: any) => c.stakeholder_role === 'champion')
    const hasEconomicBuyer = contacts.some((c: any) => c.stakeholder_role === 'economic_buyer')

    const hasLeadAtConnectedOrBeyond = activeLeads.some((l: any) =>
      ['connected', 'presentation', 'demo', 'evaluating'].includes(l.stage.toLowerCase())
    )

    const leads: LeadSummary[] = rawLeads.map((l: any) => ({
      id: l.id,
      opportunity_name: l.opportunity_name,
      stage: l.stage,
      last_connect_date: l.last_connect_date,
      deal_value: Number(l.deal_value || 0),
      forecast_close_date: l.forecast_close_date
    }))

    const contactSummaries: ContactSummary[] = contacts.map((c: any) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      stakeholder_role: c.stakeholder_role,
      lead_id: c.lead_id
    }))

    // Recent activities chronologically merged
    const recentActivities: ActivitySummary[] = []
    rawLeads.forEach((l: any) => {
      const activities = l.lead_activities || []
      activities.forEach((act: any) => {
        recentActivities.push({
          id: act.id,
          activity_type: act.activity_type,
          activity_date: act.activity_date,
          note: act.note,
          lead_id: l.id,
          opportunity_name: l.opportunity_name
        })
      })
    })

    // Sort activities descending
    recentActivities.sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())

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
