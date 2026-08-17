import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    return NextResponse.json(await requireAuth())
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
