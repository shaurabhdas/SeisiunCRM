import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'
import { sanitizeEmailHtml } from '@/lib/sanitize-html'

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

      const sanitized = (emails || []).map((email: any) => ({
        ...email,
        body_html: email.body_html ? sanitizeEmailHtml(email.body_html) : email.body_html,
      }))

      return NextResponse.json(sanitized)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
