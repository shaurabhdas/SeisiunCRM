import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getTimeframeDates(timeframe: string, referenceDate = new Date()) {
  const start = new Date(referenceDate)
  const end = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  if (timeframe === 'this-week') {
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
  } else if (timeframe === 'last-week') {
    const day = start.getDay()
    const diffToLastMonday = start.getDate() - day - 6 + (day === 0 ? -6 : 1)
    start.setDate(diffToLastMonday)
    end.setDate(start.getDate() + 6)
  } else if (timeframe === 'month-to-date') {
    start.setDate(1)
  }

  return { start, end }
}

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
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    )
  }
}
