import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const { data: attachments, error } = await supabase
        .from('email_attachments')
        .select('*')
        .order('category', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(attachments)
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()

      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const category = (formData.get('category') as string) || 'other'

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File exceeds the 25MB limit' }, { status: 400 })
      }

      const storagePath = `${authUser.id}/${Date.now()}-${file.name}`

      const { error: uploadErr } = await supabase
        .storage
        .from('email-attachments')
        .upload(storagePath, file, { contentType: file.type })

      if (uploadErr) throw uploadErr

      const { data: attachment, error: insertErr } = await supabase
        .from('email_attachments')
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          uploaded_by: authUser.id,
          uploaded_by_name: authUser.full_name,
          category,
        })
        .select()
        .single()

      if (insertErr) throw insertErr
      return NextResponse.json(attachment, { status: 201 })
    } catch (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 })
    }
  })
}
