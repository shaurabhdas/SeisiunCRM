import { NextRequest, NextResponse } from 'next/server'
import { fetchAccountsWithMetrics } from '@/lib/accounts'
import { calculateAccountHealth } from '@/lib/accountHealth'

export async function GET(request: NextRequest) {
  try {
    const accounts = await fetchAccountsWithMetrics()

    const dormant = accounts.map(acc => {
      const inputs = {
        lastActivityDays: acc.lastActivityDays,
        stakeholderCoverage: {
          hasChampion: acc.hasChampion,
          hasEconomicBuyer: acc.hasEconomicBuyer
        },
        furthestStage: acc.furthestStage,
        totalDealValue: acc.totalDealValue,
        hasLeadAtConnectedOrBeyond: acc.hasLeadAtConnectedOrBeyond
      }
      const health = calculateAccountHealth(inputs)
      const lastActivityDateStr = acc.recentActivities[0]?.activity_date
        ? new Date(acc.recentActivities[0].activity_date).toISOString().split('T')[0]
        : 'No activity'

      return {
        id: acc.id,
        name: acc.name,
        totalDealValue: acc.totalDealValue,
        lastActivity: lastActivityDateStr,
        lastActivityDays: acc.lastActivityDays !== null ? acc.lastActivityDays : 99,
        healthScore: health.score,
        band: health.band
      }
    })

    // Filter where health band is Critical or At Risk
    const filtered = dormant
      .filter(d => d.band === 'Critical' || d.band === 'At Risk')
      .sort((a, b) => a.healthScore - b.healthScore)
      .map(({ band, ...rest }) => rest)

    return NextResponse.json(filtered)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : JSON.stringify(error) },
      { status: 500 }
    )
  }
}
