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

    // Fetch activities in timeframe
    const { data: activities, error: err } = await supabase
      .from('lead_activities')
      .select('*')
      .gte('activity_date', start.toISOString().split('T')[0])
      .lte('activity_date', end.toISOString().split('T')[0])

    if (err) throw err

    const acts = activities || []

    // Fetch auth users
    const userMap = new Map<string, string>()
    try {
      const { data: userData } = await supabase.auth.admin.listUsers()
      if (userData?.users) {
        userData.users.forEach(u => {
          const name = u.user_metadata?.name || u.email || 'Representative'
          userMap.set(u.id, name)
        })
      }
    } catch (e) {
      console.warn('Failed to list auth users:', e)
    }

    // Group by logged_by
    const repMap = new Map<string, { emails: number; calls: number; meetings: number; presentations: number; demos: number }>()

    acts.forEach(act => {
      const repId = act.logged_by || 'Unassigned'
      if (!repMap.has(repId)) {
        repMap.set(repId, { emails: 0, calls: 0, meetings: 0, presentations: 0, demos: 0 })
      }
      const counts = repMap.get(repId)!
      const type = act.activity_type?.toLowerCase()
      if (type === 'email') counts.emails++
      else if (type === 'call') counts.calls++
      else if (type === 'meeting') counts.meetings++
      else if (type === 'presentation') counts.presentations++
      else if (type === 'demo') counts.demos++
    })

    const leaderboard = Array.from(repMap.entries()).map(([repId, counts]) => {
      let name = 'Unassigned'
      if (repId !== 'Unassigned') {
        name = userMap.get(repId) || `Rep ${repId.slice(0, 4)}`
      }

      const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'UA'

      const score = 
        counts.emails * 1 +
        counts.calls * 2 +
        counts.meetings * 3 +
        counts.presentations * 4 +
        counts.demos * 5

      return {
        name,
        initials,
        emails: counts.emails,
        calls: counts.calls,
        meetings: counts.meetings,
        presentations: counts.presentations,
        demos: counts.demos,
        score
      }
    })

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score)

    return NextResponse.json(leaderboard)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    )
  }
}
