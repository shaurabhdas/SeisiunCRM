import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRollingDayBuckets } from '@/lib/followup'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'this-week'

    // A rolling window ending today (or offset back for 'last-week') instead
    // of fixed Mon-Sun / week-of-month buckets, which showed an empty chart
    // every Monday (or 1st of the month) until enough of the new period had
    // passed to log anything into it.
    const windowDays = timeframe === 'month-to-date' ? 30 : 7
    const endOffsetDays = timeframe === 'last-week' ? 7 : 0
    const buckets = getRollingDayBuckets(windowDays, new Date(), endOffsetDays)

    const { data: activities, error: err } = await supabase
      .from('lead_activities')
      .select('*')
      .gte('activity_date', buckets[0].date)
      .lte('activity_date', buckets[buckets.length - 1].date)

    if (err) throw err

    const acts = activities || []
    const byDate = new Map(buckets.map(b => [b.date, { name: b.label, emails: 0, calls: 0 }]))

    acts.forEach(act => {
      if (!act.activity_date) return
      const bucket = byDate.get(act.activity_date.split('T')[0])
      if (!bucket) return
      const type = act.activity_type?.toLowerCase()
      if (type === 'email') {
        bucket.emails++
      } else if (type === 'call') {
        bucket.calls++
      }
    })

    return NextResponse.json(buckets.map(b => byDate.get(b.date)))
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
