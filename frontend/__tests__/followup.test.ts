import { describe, it, expect } from 'vitest'
import {
  calculateDaysSinceContact,
  getFollowUpColorToken,
  formatFollowUpDisplay,
} from '@/lib/followup'

describe('calculateDaysSinceContact', () => {

  it('returns null when last_connect_date is null', () => {
    expect(calculateDaysSinceContact(null)).toBeNull()
  })

  it('returns 0 when last_connect_date is today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(calculateDaysSinceContact(today)).toBe(0)
  })

  it('returns 1 when last_connect_date was yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    expect(calculateDaysSinceContact(yesterday)).toBe(1)
  })

  it('returns 3 correctly at the safe to warning boundary', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]
    expect(calculateDaysSinceContact(threeDaysAgo)).toBe(3)
  })

  it('returns 7 correctly at the warning to urgent boundary', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    expect(calculateDaysSinceContact(sevenDaysAgo)).toBe(7)
  })

  it('returns 10 correctly at the urgent to critical boundary', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0]
    expect(calculateDaysSinceContact(tenDaysAgo)).toBe(10)
  })

  it('returns 12 for a date 12 days ago', () => {
    const twelveDaysAgo = new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0]
    expect(calculateDaysSinceContact(twelveDaysAgo)).toBe(12)
  })

  it('does not return a negative number for a future date', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const result = calculateDaysSinceContact(tomorrow)
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('calculates correctly using local calendar date not UTC midnight', () => {
    const today = new Date()
    const localDateString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
    expect(calculateDaysSinceContact(localDateString)).toBe(0)
  })
})

describe('getFollowUpColorToken', () => {

  it('returns critical token when days is null because no contact means highest urgency', () => {
    expect(getFollowUpColorToken(null)).toBe('--followup-critical')
  })

  it('returns safe token for 0 days', () => {
    expect(getFollowUpColorToken(0)).toBe('--followup-safe')
  })

  it('returns safe token for 2 days', () => {
    expect(getFollowUpColorToken(2)).toBe('--followup-safe')
  })

  it('returns warning token at exactly 3 days', () => {
    expect(getFollowUpColorToken(3)).toBe('--followup-warning')
  })

  it('returns warning token for 5 days', () => {
    expect(getFollowUpColorToken(5)).toBe('--followup-warning')
  })

  it('returns urgent token at exactly 7 days', () => {
    expect(getFollowUpColorToken(7)).toBe('--followup-urgent')
  })

  it('returns urgent token for 9 days', () => {
    expect(getFollowUpColorToken(9)).toBe('--followup-urgent')
  })

  it('returns critical token at exactly 10 days', () => {
    expect(getFollowUpColorToken(10)).toBe('--followup-critical')
  })

  it('returns critical token for 15 days', () => {
    expect(getFollowUpColorToken(15)).toBe('--followup-critical')
  })
})

describe('formatFollowUpDisplay', () => {

  it('returns No contact when days is null', () => {
    expect(formatFollowUpDisplay(null)).toBe('No contact')
  })

  it('returns 0d for 0 days', () => {
    expect(formatFollowUpDisplay(0)).toBe('0d')
  })

  it('returns 6d for 6 days which is below the bold threshold', () => {
    expect(formatFollowUpDisplay(6)).toBe('6d')
  })

  it('returns 7d for 7 days which is at the bold threshold', () => {
    expect(formatFollowUpDisplay(7)).toBe('7d')
  })

  it('returns 12d for 12 days', () => {
    expect(formatFollowUpDisplay(12)).toBe('12d')
  })
})
