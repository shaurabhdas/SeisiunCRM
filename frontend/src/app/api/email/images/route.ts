import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { requireAuth } from '@/lib/auth'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export async function POST(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()

      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Only PNG, JPEG, GIF, or WEBP images are allowed' }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Image exceeds the 5MB limit' }, { status: 400 })
      }

      const storagePath = `${authUser.id}/${Date.now()}-${file.name}`

      const { error: uploadErr } = await supabase
        .storage
        .from('signature-images')
        .upload(storagePath, file, { contentType: file.type })

      if (uploadErr) throw uploadErr

      const { data } = supabase.storage.from('signature-images').getPublicUrl(storagePath)

      return NextResponse.json({ url: data.publicUrl }, { status: 201 })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
    }
  })
}
