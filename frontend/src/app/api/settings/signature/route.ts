import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

async function getScopedClient() {
  const cookieStore = await cookies()
  const headerList = await headers()
  const schema = headerList.get('x-supabase-schema') || 'public'

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component context
          }
        },
      },
    }
  )
}

export async function GET() {
  try {
    const authUser = await requireAuth()
    const supabase = await getScopedClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('signature_html')
      .eq('id', authUser.id)
      .single()

    if (error) throw error
    return NextResponse.json({ signatureHtml: data?.signature_html || '' })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await requireAuth()
    const { signatureHtml } = await request.json()
    const supabase = await getScopedClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({ signature_html: signatureHtml || null, updated_at: new Date().toISOString() })
      .eq('id', authUser.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
  }
}
