export const AVERAGE_DEAL_SIZE = 350000

export type StakeholderCoverage = {
  hasChampion: boolean
  hasEconomicBuyer: boolean
}

export type AccountHealthInputs = {
  lastActivityDays: number | null
  stakeholderCoverage: StakeholderCoverage
  furthestStage: string | null
  totalDealValue: number
  hasLeadAtConnectedOrBeyond: boolean
}

export type AccountHealthResult = {
  score: number
  band: 'Healthy' | 'Developing' | 'At Risk' | 'Critical'
  bandColor: string
  breakdown: {
    engagementVelocity: number
    stakeholderCoverage: number
    stageDepth: number
    pipelineValue: number
  }
}

export function calculateEngagementVelocity(
  lastActivityDays: number | null
): number {
  if (lastActivityDays === null) return 0
  if (lastActivityDays <= 3) return 35
  if (lastActivityDays <= 7) return 22
  if (lastActivityDays <= 10) return 10
  return 0
}

export function calculateStakeholderCoverage(
  coverage: StakeholderCoverage
): number {
  let score = 0
  if (coverage.hasChampion) score += 15
  if (coverage.hasEconomicBuyer) score += 15
  return score
}

export function calculateStageDepth(furthestStage: string | null): number {
  if (!furthestStage) return 0
  const stageScores: Record<string, number> = {
    contact: 0,
    outreach: 5,
    connected: 10,
    presentation: 15,
    demo: 25,
    evaluating: 25,
  }
  return stageScores[furthestStage.toLowerCase()] ?? 0
}

export function calculatePipelineValue(
  totalDealValue: number,
  hasLeadAtConnectedOrBeyond: boolean
): number {
  if (!hasLeadAtConnectedOrBeyond) return 0
  if (totalDealValue >= AVERAGE_DEAL_SIZE) return 10
  if (totalDealValue >= AVERAGE_DEAL_SIZE / 2) return 5
  return 0
}

export function getHealthBand(
  score: number
): AccountHealthResult['band'] {
  if (score >= 75) return 'Healthy'
  if (score >= 50) return 'Developing'
  if (score >= 25) return 'At Risk'
  return 'Critical'
}

export function getHealthBandColor(band: AccountHealthResult['band']): string {
  const colors: Record<AccountHealthResult['band'], string> = {
    Healthy: '--followup-safe',
    Developing: '--followup-warning',
    'At Risk': '--followup-urgent',
    Critical: '--followup-critical',
  }
  return colors[band]
}

export function calculateAccountHealth(
  inputs: AccountHealthInputs
): AccountHealthResult {
  const engagementVelocity = calculateEngagementVelocity(
    inputs.lastActivityDays
  )
  const stakeholderCoverage = calculateStakeholderCoverage(
    inputs.stakeholderCoverage
  )
  const stageDepth = calculateStageDepth(inputs.furthestStage)
  const pipelineValue = calculatePipelineValue(
    inputs.totalDealValue,
    inputs.hasLeadAtConnectedOrBeyond
  )

  const score =
    engagementVelocity + stakeholderCoverage + stageDepth + pipelineValue

  const band = getHealthBand(score)
  const bandColor = getHealthBandColor(band)

  return {
    score,
    band,
    bandColor,
    breakdown: {
      engagementVelocity,
      stakeholderCoverage,
      stageDepth,
      pipelineValue,
    },
  }
}
