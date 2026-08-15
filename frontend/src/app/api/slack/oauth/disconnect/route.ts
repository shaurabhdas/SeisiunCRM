import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

export async function DELETE(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      if (authUser.role !== 'super_admin') {
        return NextResponse.json({ error: 'Only a super admin can disconnect Slack.' }, { status: 403 })
      }

      const { error } = await supabase
        .from('slack_integrations')
        .delete()
        .eq('id', 'default')

      if (error) throw error
      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
