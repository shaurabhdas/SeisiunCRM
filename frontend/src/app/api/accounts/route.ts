import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAccountsWithMetrics } from '@/lib/accounts'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const data = await fetchAccountsWithMetrics()
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/accounts error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, industry, company_size, sales_region, notes } = body

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        name,
        industry: industry || null,
        company_size: company_size || null,
        sales_region: sales_region || 'US East',
        notes: notes || null
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
