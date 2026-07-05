import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('sales_region')

    if (error) throw error

    const regions = Array.from(new Set((accounts || []).map(a => a.sales_region).filter(Boolean)))
    return NextResponse.json(regions)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
