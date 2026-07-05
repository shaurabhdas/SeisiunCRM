import { NextResponse } from 'next/server'
import { fetchAccountsWithMetrics } from '@/lib/accounts'

export async function GET() {
  try {
    const data = await fetchAccountsWithMetrics()
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/accounts error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
