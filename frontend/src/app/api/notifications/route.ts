import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const { searchParams } = new URL(request.url)
      const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error

      const { count: unreadCount, error: countErr } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', authUser.id)
        .eq('read', false)
      if (countErr) throw countErr

      return NextResponse.json({
        notifications: (notifications || []).map((n: any) => ({
          id: n.id,
          type: n.type,
          recordType: n.record_type,
          recordId: n.record_id,
          recordName: n.record_name,
          message: n.message,
          actorName: n.actor_name,
          read: n.read,
          createdAt: n.created_at,
        })),
        unreadCount: unreadCount || 0,
      })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
