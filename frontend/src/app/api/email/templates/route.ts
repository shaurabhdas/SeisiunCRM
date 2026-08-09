import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'
import { sanitizeEmailHtml } from '@/lib/sanitize-html'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const { data: templates, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('industry', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return NextResponse.json(templates)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      if (!isManagerOrAbove(authUser.role)) {
        return NextResponse.json({ error: 'Forbidden: requires Manager or Super Admin role' }, { status: 403 })
      }

      const body = await request.json()
      const { name, industry, subject, bodyHtml } = body

      if (!name || !industry || !subject || !bodyHtml) {
        return NextResponse.json(
          { error: 'Missing required fields: name, industry, subject, bodyHtml' },
          { status: 400 }
        )
      }

      const { data: template, error } = await supabase
        .from('email_templates')
        .insert({
          name,
          industry,
          subject,
          body_html: sanitizeEmailHtml(bodyHtml),
          created_by: authUser.id,
          created_by_name: authUser.full_name,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(template, { status: 201 })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
