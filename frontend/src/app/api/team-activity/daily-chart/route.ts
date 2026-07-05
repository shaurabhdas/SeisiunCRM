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

    if (timeframe === 'month-to-date') {
      // Group by weeks
      const weeks = [
        { name: "Wk 1", emails: 0, calls: 0 },
        { name: "Wk 2", emails: 0, calls: 0 },
        { name: "Wk 3", emails: 0, calls: 0 },
        { name: "Wk 4", emails: 0, calls: 0 },
        { name: "Wk 5", emails: 0, calls: 0 }
      ]

      acts.forEach(act => {
        if (!act.activity_date) return
        const date = new Date(act.activity_date)
        const dayOfMonth = date.getDate()
        const weekIndex = Math.min(4, Math.floor((dayOfMonth - 1) / 7))
        const type = act.activity_type?.toLowerCase()
        if (type === 'email') {
          weeks[weekIndex].emails++
        } else if (type === 'call') {
          weeks[weekIndex].calls++
        }
      })

      // Filter out Week 5 if it has 0 emails and calls
      const result = weeks.filter((w, idx) => idx < 4 || w.emails > 0 || w.calls > 0)
      return NextResponse.json(result)
    } else {
      // Group by day of week Mon-Sun
      const days = [
        { name: "Mon", emails: 0, calls: 0 },
        { name: "Tue", emails: 0, calls: 0 },
        { name: "Wed", emails: 0, calls: 0 },
        { name: "Thu", emails: 0, calls: 0 },
        { name: "Fri", emails: 0, calls: 0 },
        { name: "Sat", emails: 0, calls: 0 },
        { name: "Sun", emails: 0, calls: 0 }
      ]

      acts.forEach(act => {
        if (!act.activity_date) return
        const date = new Date(act.activity_date)
        const dayIndex = (date.getDay() + 6) % 7
        const type = act.activity_type?.toLowerCase()
        if (type === 'email') {
          days[dayIndex].emails++
        } else if (type === 'call') {
          days[dayIndex].calls++
        }
      })

      return NextResponse.json(days)
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    )
  }
}
