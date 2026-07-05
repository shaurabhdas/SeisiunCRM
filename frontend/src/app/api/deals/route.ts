import { NextRequest, NextResponse } from 'next/server'
import { fetchDeals, createDeal } from '@/lib/deals'

export async function GET() {
  try {
    const deals = await fetchDeals()
    return NextResponse.json(deals)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch deals', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const { opportunity_name, deal_type, reported_value, sales_region, account_id, accountName } = payload

    // Validate required fields
    if (!opportunity_name || !deal_type || reported_value === undefined || !sales_region) {
      return NextResponse.json(
        { error: 'Missing required fields: opportunity_name, deal_type, reported_value, sales_region' },
        { status: 400 }
      )
    }

    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let finalAccountId = account_id
    if (!finalAccountId && accountName) {
      const { data: existingAccount } = await supabase
        .from('accounts')
        .select('id')
        .ilike('name', accountName)
        .maybeSingle()

      if (existingAccount) {
        finalAccountId = existingAccount.id
      } else {
        const { data: newAccount, error: accErr } = await supabase
          .from('accounts')
          .insert({
            name: accountName,
            sales_region: sales_region
          })
          .select()
          .single()
        if (accErr) throw accErr
        finalAccountId = newAccount.id
      }
    }

    const newDeal = await createDeal({
      ...payload,
      account_id: finalAccountId || null
    })
    return NextResponse.json(newDeal, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create deal', details: String(error) },
      { status: 500 }
    )
  }
}
