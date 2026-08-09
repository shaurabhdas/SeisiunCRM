import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      if (!isManagerOrAbove(authUser.role)) {
        return NextResponse.json({ error: 'Forbidden: requires Manager or Super Admin role' }, { status: 403 })
      }

      const { id } = await params
      const body = await request.json()
      const { name, industry, subject, bodyHtml } = body

      const { data: template, error } = await supabase
        .from('email_templates')
        .update({
          name,
          industry,
          subject,
          body_html: bodyHtml,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(template)
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      if (!isManagerOrAbove(authUser.role)) {
        return NextResponse.json({ error: 'Forbidden: requires Manager or Super Admin role' }, { status: 403 })
      }

      const { id } = await params
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  })
}
