import { NextRequest, NextResponse } from 'next/server'
import { logDealActivity } from '@/lib/deals'
import { schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const { id } = await params
      const body = await request.json()
      const { activity_type, activity_date, note } = body

      if (!activity_type || !activity_date) {
        return NextResponse.json(
          { error: 'Missing required fields: activity_type, activity_date' },
          { status: 400 }
        )
      }

      const activity = await logDealActivity(id, activity_type, activity_date, note, authUser.id)
      return NextResponse.json(activity, { status: 201 })
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to log deal activity', details: String(error) },
        { status: 500 }
      )
    }
  })
}
