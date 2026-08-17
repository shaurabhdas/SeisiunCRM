import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const body = await request.json()
      const { ids, all } = body as { ids?: string[]; all?: boolean }

      let query = supabase.from('notifications').update({ read: true }).eq('recipient_id', authUser.id)
      if (!all) {
        if (!ids || ids.length === 0) {
          return NextResponse.json({ error: 'No notification ids provided' }, { status: 400 })
        }
        query = query.in('id', ids)
      }
      const { error } = await query
      if (error) throw error

      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
