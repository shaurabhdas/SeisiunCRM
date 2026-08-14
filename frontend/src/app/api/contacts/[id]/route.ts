import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth, isManagerOrAbove } from '@/lib/auth'
import { updateContact, restrictToAssociationFields, ContactInput } from '@/lib/contacts'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const { id } = await params

      const { data: existing, error: fetchErr } = await supabase
        .from('contacts')
        .select('created_by')
        .eq('id', id)
        .single()
      if (fetchErr) throw fetchErr

      const isCreator = !!existing.created_by && existing.created_by === authUser.id
      const canEditFully = isManagerOrAbove(authUser.role)

      // Everyone else can view (GET /api/contacts is open to any authed user);
      // only the creator (association fields only) or a manager/super_admin
      // (everything) may write.
      if (!canEditFully && !isCreator) {
        return NextResponse.json(
          { error: "Forbidden: only this contact's creator or a manager/super admin can edit it." },
          { status: 403 }
        )
      }

      const body: ContactInput = await request.json()
      const payload = canEditFully ? body : restrictToAssociationFields(body)

      const contact = await updateContact(id, payload)
      return NextResponse.json(contact)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
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
        return NextResponse.json(
          { error: 'Forbidden: only a manager or super admin can delete a contact.' },
          { status: 403 }
        )
      }

      const { id } = await params
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) throw error

      return NextResponse.json({ success: true })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
