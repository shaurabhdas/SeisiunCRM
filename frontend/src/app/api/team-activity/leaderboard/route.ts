import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'

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
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const { searchParams } = new URL(request.url)
      const timeframe = searchParams.get('timeframe') || 'this-week'

      const { start, end } = getTimeframeDates(timeframe)

      // 1. Fetch activities in timeframe
      const { data: activities, error: err } = await supabase
        .from('lead_activities')
        .select('*')
        .gte('activity_date', start.toISOString().split('T')[0])
        .lte('activity_date', end.toISOString().split('T')[0])

      if (err) throw err

      const acts = activities || []

      // 2. Fetch user profiles to map representative names
      const { data: profiles, error: profErr } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
      if (profErr) throw profErr

      const profileMap = new Map<string, { name: string; email: string }>()
      if (profiles) {
        profiles.forEach((p: any) => {
          profileMap.set(p.id, {
            name: p.full_name || p.email || 'Representative',
            email: p.email
          })
        })
      }

      // 3. Group by logged_by
      const repMap = new Map<string, { emails: number; calls: number; meetings: number; presentations: number; demos: number }>()
      let unattributedCounts = { emails: 0, calls: 0, meetings: 0, presentations: 0, demos: 0 }
      let hasUnattributed = false

      acts.forEach((act: any) => {
        const loggedBy = act.logged_by
        const type = act.activity_type?.toLowerCase()

        if (!loggedBy) {
          hasUnattributed = true
          if (type === 'email') unattributedCounts.emails++
          else if (type === 'call') unattributedCounts.calls++
          else if (type === 'meeting') unattributedCounts.meetings++
          else if (type === 'presentation') unattributedCounts.presentations++
          else if (type === 'demo') unattributedCounts.demos++
        } else {
          if (!repMap.has(loggedBy)) {
            repMap.set(loggedBy, { emails: 0, calls: 0, meetings: 0, presentations: 0, demos: 0 })
          }
          const counts = repMap.get(loggedBy)!
          if (type === 'email') counts.emails++
          else if (type === 'call') counts.calls++
          else if (type === 'meeting') counts.meetings++
          else if (type === 'presentation') counts.presentations++
          else if (type === 'demo') counts.demos++
        }
      })

      // 4. Calculate scores for attributed reps
      const leaderboard = Array.from(repMap.entries()).map(([repId, counts]) => {
        const profile = profileMap.get(repId)
        const name = profile?.name || `Rep ${repId.slice(0, 4)}`
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

      // Sort primary rep entries by score descending
      leaderboard.sort((a, b) => b.score - a.score)

      // 5. Append Unattributed row at the bottom if any exist
      if (hasUnattributed) {
        const score = 
          unattributedCounts.emails * 1 +
          unattributedCounts.calls * 2 +
          unattributedCounts.meetings * 3 +
          unattributedCounts.presentations * 4 +
          unattributedCounts.demos * 5

        leaderboard.push({
          name: 'Unattributed',
          initials: 'UA',
          emails: unattributedCounts.emails,
          calls: unattributedCounts.calls,
          meetings: unattributedCounts.meetings,
          presentations: unattributedCounts.presentations,
          demos: unattributedCounts.demos,
          score
        })
      }

      return NextResponse.json(leaderboard)
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard data', details: String(error) },
        { status: 500 }
      )
    }
  })
}
