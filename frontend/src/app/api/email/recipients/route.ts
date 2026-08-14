import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('first_name, last_name, email, account_id')
        .not('email', 'is', null)
        .order('first_name', { ascending: true })

      if (error) throw error

      const seenEmails = new Set<string>()
      const recipients = (contacts || [])
        .filter((c: any) => {
          if (!c.email || seenEmails.has(c.email)) return false
          seenEmails.add(c.email)
          return true
        })
        .map((c: any) => ({
          name: `${c.first_name} ${c.last_name}`.trim(),
          firstName: c.first_name || "",
          email: c.email,
          accountId: c.account_id,
        }))

      return NextResponse.json(recipients)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
