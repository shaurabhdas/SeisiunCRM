import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTimeframeDates } from '@/lib/followup'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'this-week'

    const { start, end } = getTimeframeDates(timeframe)

    const { data: activities, error: err } = await supabase
      .from('lead_activities')
      .select('*')
      .gte('activity_date', start.toISOString().split('T')[0])
      .lte('activity_date', end.toISOString().split('T')[0])

    if (err) throw err

    const acts = activities || []

    const emailsCount = acts.filter(a => a.activity_type?.toLowerCase() === 'email').length
    const callsCount = acts.filter(a => a.activity_type?.toLowerCase() === 'call').length
    const meetingsCount = acts.filter(a => a.activity_type?.toLowerCase() === 'meeting').length
    const proposalsCount = acts.filter(a => a.activity_type?.toLowerCase() === 'presentation').length

    return NextResponse.json({
      emails: { label: "Total Emails Sent", value: emailsCount.toLocaleString() },
      calls: { label: "Total Calls Made", value: callsCount.toLocaleString() },
      meetings: { label: "Meetings Booked", value: meetingsCount.toLocaleString() },
      proposals: { label: "Proposals Sent", value: proposalsCount.toLocaleString() },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
