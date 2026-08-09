export function calculateDaysSinceContact(
  lastConnectDate: string | null
): number | null {
  if (!lastConnectDate) return null
  const dateOnly = lastConnectDate.split('T')[0]
  const today = new Date()
  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  const [year, month, day] = dateOnly.split('-').map(Number)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  const lastUTC = Date.UTC(year, month - 1, day)
  const diffTime = todayUTC - lastUTC
  if (diffTime < 0) return 0
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export function getTimeframeDates(timeframe: string, referenceDate = new Date()) {
  const start = new Date(referenceDate)
  const end = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  if (timeframe === 'this-week') {
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
  } else if (timeframe === 'last-week') {
    const day = start.getDay()
    const diffToLastMonday = start.getDate() - day - 6 + (day === 0 ? -6 : 1)
    start.setDate(diffToLastMonday)
    end.setDate(start.getDate() + 6)
  } else if (timeframe === 'month-to-date' || timeframe === 'this-month') {
    start.setDate(1)
  } else if (timeframe === 'this-year') {
    start.setMonth(0, 1)
  } else if (timeframe === 'all-time') {
    start.setTime(new Date(2020, 0, 1).getTime())
  }
  // 'today' needs no adjustment - start/end already bracket referenceDate's day

  return { start, end }
}

export function getFollowUpColorToken(days: number | null): string {
  if (days === null) return '--followup-critical'
  if (days >= 10) return '--followup-critical'
  if (days >= 7) return '--followup-urgent'
  if (days >= 3) return '--followup-warning'
  return '--followup-safe'
}

export function formatFollowUpDisplay(days: number | null): string {
  if (days === null) return 'No contact'
  return `${days}d`
}

export function formatDealValue(value: number | null): string {
  if (!value || value === 0) return 'Not entered'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
