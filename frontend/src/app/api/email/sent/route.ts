import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const { searchParams } = new URL(request.url)
      const all = searchParams.get('all') === 'true'

      let query = supabase
        .from('emails')
        .select('*')
        .order('sent_at', { ascending: false })

      if (!(all && isManagerOrAbove(authUser.role))) {
        query = query.eq('sent_by', authUser.id)
      }

      const { data: emails, error } = await query
      if (error) throw error
      return NextResponse.json(emails)
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  })
}
