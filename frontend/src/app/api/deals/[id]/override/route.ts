import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { value, stage, nextAction, manualProbability, overrideRiskFlag, customRiskText } = body

    const { data, error } = await supabase
      .from('leads')
      .update({
        deal_value: value ? Number(value) : undefined,
        stage: stage || undefined,
        pain_points: nextAction || undefined,
        manual_probability: manualProbability,
        override_risk_flag: overrideRiskFlag,
        custom_risk_text: customRiskText || null
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
  }
}
