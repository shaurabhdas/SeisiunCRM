import { NextRequest, NextResponse } from 'next/server'
import { schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'
import { fetchContactsWithRelations, createContact, ContactInput } from '@/lib/contacts'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      await requireAuth()
      const contacts = await fetchContactsWithRelations()
      return NextResponse.json(contacts)
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
      const body: ContactInput = await request.json()

      const contact = await createContact(body, authUser.id, authUser.full_name)
      return NextResponse.json(contact, { status: 201 })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
