export function calculateDaysSinceContact(
  lastConnectDate: string | null
): number | null {
  if (!lastConnectDate) return null
  const today = new Date()
  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  const [year, month, day] = lastConnectDate.split('-').map(Number)
  const lastUTC = Date.UTC(year, month - 1, day)
  const diffTime = todayUTC - lastUTC
  if (diffTime < 0) return 0
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
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
