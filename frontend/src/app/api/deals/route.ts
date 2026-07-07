import { NextRequest, NextResponse } from 'next/server'
import { supabase, schemaStorage } from '@/lib/accounts'
import { fetchDeals, createDeal } from '@/lib/deals'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const deals = await fetchDeals()
      return NextResponse.json(deals)
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch deals', details: String(error) },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const payload = await request.json()
      let { opportunity_name, deal_type, reported_value, sales_region, account_id, accountName, originating_deal_id, proposal_date } = payload

      // Validate required fields
      if (!opportunity_name || !deal_type || reported_value === undefined || !sales_region) {
        return NextResponse.json(
          { error: 'Missing required fields: opportunity_name, deal_type, reported_value, sales_region' },
          { status: 400 }
        )
      }

      if (originating_deal_id && !proposal_date) {
        proposal_date = new Date().toISOString().split('T')[0]
      }

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
        account_id: finalAccountId || null,
        proposal_date: proposal_date,
        assigned_rep_id: authUser.id,
        assigned_rep_name: authUser.full_name
      })
      return NextResponse.json(newDeal, { status: 201 })
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to create deal', details: String(error) },
        { status: 500 }
      )
    }
  })
}
