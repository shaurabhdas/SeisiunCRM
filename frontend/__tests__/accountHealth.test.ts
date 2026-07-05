import { describe, it, expect } from 'vitest'
import {
  calculateEngagementVelocity,
  calculateStakeholderCoverage,
  calculateStageDepth,
  calculatePipelineValue,
  getHealthBand,
  calculateAccountHealth,
  AVERAGE_DEAL_SIZE,
} from '@/lib/accountHealth'

describe('calculateEngagementVelocity', () => {
  it('returns 0 when lastActivityDays is null', () => {
    expect(calculateEngagementVelocity(null)).toBe(0)
  })

  it('returns 35 for 0 days', () => {
    expect(calculateEngagementVelocity(0)).toBe(35)
  })

  it('returns 35 for 3 days', () => {
    expect(calculateEngagementVelocity(3)).toBe(35)
  })

  it('returns 22 for 4 days', () => {
    expect(calculateEngagementVelocity(4)).toBe(22)
  })

  it('returns 22 for 7 days', () => {
    expect(calculateEngagementVelocity(7)).toBe(22)
  })

  it('returns 10 for 8 days', () => {
    expect(calculateEngagementVelocity(8)).toBe(10)
  })

  it('returns 10 for 10 days', () => {
    expect(calculateEngagementVelocity(10)).toBe(10)
  })

  it('returns 0 for 11 days', () => {
    expect(calculateEngagementVelocity(11)).toBe(0)
  })

  it('returns 0 for 30 days', () => {
    expect(calculateEngagementVelocity(30)).toBe(0)
  })
})

describe('calculateStakeholderCoverage', () => {
  it('returns 0 when neither role is filled', () => {
    expect(
      calculateStakeholderCoverage({
        hasChampion: false,
        hasEconomicBuyer: false,
      })
    ).toBe(0)
  })

  it('returns 15 when only champion is filled', () => {
    expect(
      calculateStakeholderCoverage({
        hasChampion: true,
        hasEconomicBuyer: false,
      })
    ).toBe(15)
  })

  it('returns 15 when only economic buyer is filled', () => {
    expect(
      calculateStakeholderCoverage({
        hasChampion: false,
        hasEconomicBuyer: true,
      })
    ).toBe(15)
  })

  it('returns 30 when both roles are filled', () => {
    expect(
      calculateStakeholderCoverage({
        hasChampion: true,
        hasEconomicBuyer: true,
      })
    ).toBe(30)
  })
})

describe('calculateStageDepth', () => {
  it('returns 0 for null', () => {
    expect(calculateStageDepth(null)).toBe(0)
  })

  it('returns 0 for contact stage', () => {
    expect(calculateStageDepth('contact')).toBe(0)
  })

  it('returns 5 for outreach stage', () => {
    expect(calculateStageDepth('outreach')).toBe(5)
  })

  it('returns 10 for connected stage', () => {
    expect(calculateStageDepth('connected')).toBe(10)
  })

  it('returns 15 for presentation stage', () => {
    expect(calculateStageDepth('presentation')).toBe(15)
  })

  it('returns 25 for demo stage', () => {
    expect(calculateStageDepth('demo')).toBe(25)
  })

  it('returns 25 for evaluating stage', () => {
    expect(calculateStageDepth('evaluating')).toBe(25)
  })

  it('is case insensitive', () => {
    expect(calculateStageDepth('DEMO')).toBe(25)
    expect(calculateStageDepth('Presentation')).toBe(15)
  })
})

describe('calculatePipelineValue', () => {
  it('returns 0 when no lead is at connected or beyond', () => {
    expect(calculatePipelineValue(AVERAGE_DEAL_SIZE, false)).toBe(0)
  })

  it('returns 0 when deal value is 0 even with qualified lead', () => {
    expect(calculatePipelineValue(0, true)).toBe(0)
  })

  it('returns 5 when deal value is half of average', () => {
    expect(calculatePipelineValue(AVERAGE_DEAL_SIZE / 2, true)).toBe(5)
  })

  it('returns 10 when deal value meets average deal size', () => {
    expect(calculatePipelineValue(AVERAGE_DEAL_SIZE, true)).toBe(10)
  })

  it('returns 10 when deal value exceeds average deal size', () => {
    expect(calculatePipelineValue(AVERAGE_DEAL_SIZE * 2, true)).toBe(10)
  })
})

describe('getHealthBand', () => {
  it('returns Critical for score 0', () => {
    expect(getHealthBand(0)).toBe('Critical')
  })

  it('returns Critical for score 24', () => {
    expect(getHealthBand(24)).toBe('Critical')
  })

  it('returns At Risk for score 25', () => {
    expect(getHealthBand(25)).toBe('At Risk')
  })

  it('returns At Risk for score 49', () => {
    expect(getHealthBand(49)).toBe('At Risk')
  })

  it('returns Developing for score 50', () => {
    expect(getHealthBand(50)).toBe('Developing')
  })

  it('returns Developing for score 74', () => {
    expect(getHealthBand(74)).toBe('Developing')
  })

  it('returns Healthy for score 75', () => {
    expect(getHealthBand(75)).toBe('Healthy')
  })

  it('returns Healthy for score 100', () => {
    expect(getHealthBand(100)).toBe('Healthy')
  })
})

describe('calculateAccountHealth integration', () => {
  it('scores a fully engaged account with both stakeholders and large deal at demo stage as Healthy', () => {
    const result = calculateAccountHealth({
      lastActivityDays: 1,
      stakeholderCoverage: { hasChampion: true, hasEconomicBuyer: true },
      furthestStage: 'demo',
      totalDealValue: 350000,
      hasLeadAtConnectedOrBeyond: true,
    })
    expect(result.score).toBe(100)
    expect(result.band).toBe('Healthy')
  })

  it('scores a brand new account with no activity as Critical', () => {
    const result = calculateAccountHealth({
      lastActivityDays: null,
      stakeholderCoverage: { hasChampion: false, hasEconomicBuyer: false },
      furthestStage: 'contact',
      totalDealValue: 0,
      hasLeadAtConnectedOrBeyond: false,
    })
    expect(result.score).toBe(0)
    expect(result.band).toBe('Critical')
  })

  it('scores an account with champion but no activity and early stage as At Risk', () => {
    const result = calculateAccountHealth({
      lastActivityDays: 15,
      stakeholderCoverage: { hasChampion: true, hasEconomicBuyer: false },
      furthestStage: 'outreach',
      totalDealValue: 0,
      hasLeadAtConnectedOrBeyond: false,
    })
    expect(result.score).toBe(20)
    expect(result.band).toBe('Critical')
  })

  it('returns a breakdown object with four components summing to the total score', () => {
    const result = calculateAccountHealth({
      lastActivityDays: 5,
      stakeholderCoverage: { hasChampion: true, hasEconomicBuyer: false },
      furthestStage: 'presentation',
      totalDealValue: 200000,
      hasLeadAtConnectedOrBeyond: true,
    })
    const { engagementVelocity, stakeholderCoverage, stageDepth, pipelineValue } =
      result.breakdown
    expect(
      engagementVelocity + stakeholderCoverage + stageDepth + pipelineValue
    ).toBe(result.score)
  })
})
