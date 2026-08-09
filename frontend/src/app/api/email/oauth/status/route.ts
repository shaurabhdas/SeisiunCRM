import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()

      const { data: tokenRecord } = await supabase
        .from('microsoft_oauth_tokens')
        .select('outlook_email')
        .eq('user_id', authUser.id)
        .single()

      return NextResponse.json({
        connected: !!tokenRecord,
        email: tokenRecord?.outlook_email || null,
      })
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  })
}
