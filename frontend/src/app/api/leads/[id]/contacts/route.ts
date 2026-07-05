import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function camelCaseContact(c: any) {
  if (!c) return null
  return {
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    email: c.email,
    phone: c.phone,
    leadId: c.lead_id,
    accountId: c.account_id,
    stakeholderRole: c.stakeholder_role,
    createdAt: c.created_at
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { firstName, lastName, email, phone, stakeholderRole } = body

    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id, account_id')
      .eq('id', id)
      .single()

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        lead_id: lead.id,
        account_id: lead.account_id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        stakeholder_role: stakeholderRole
      })
      .select()
      .single()

    if (contactErr) throw contactErr
    return NextResponse.json(camelCaseContact(contact), { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
