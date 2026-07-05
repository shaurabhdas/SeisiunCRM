import { NextResponse } from 'next/server'
import { fetchAccountsWithMetrics, supabase } from '@/lib/accounts'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const data = await fetchAccountsWithMetrics()
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/accounts error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, industry, company_size, sales_region, notes } = body

    const payload = {
      id: randomUUID(),
      name,
      industry: industry || null,
      company_size: company_size || null,
      sales_region: sales_region || 'US East',
      notes: notes || null
    }

    console.log("Supabase insert payload:", payload)

    const { data, error } = await supabase
      .from('accounts')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("POST /api/accounts error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
