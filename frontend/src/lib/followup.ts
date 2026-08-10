// The timezone the business actually operates in. All "today"/"this week"/etc.
// boundaries are anchored here rather than to the runtime's local timezone —
// Vercel's Node functions run with TZ=UTC, so anchoring to server-local time
// flips "today" over at 8pm Eastern instead of midnight, silently
// reclassifying same-day records (activity_date, close_date, created_at) into
// the wrong period for several hours around every UTC day boundary.
const BUSINESS_TIMEZONE = 'America/New_York'

// Wall-clock Y/M/D/H/M/S for `date` as seen in `timeZone`.
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  return {
    year: Number(map.year), month: Number(map.month), day: Number(map.day),
    hour: Number(map.hour), minute: Number(map.minute), second: Number(map.second)
  }
}

// The real UTC instant corresponding to a wall-clock date/time in `timeZone`.
function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, ms: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, ms)
  const seenInZone = zonedParts(new Date(guess), timeZone)
  const seenAsUtc = Date.UTC(seenInZone.year, seenInZone.month - 1, seenInZone.day, seenInZone.hour, seenInZone.minute, seenInZone.second, ms)
  return new Date(guess - (seenAsUtc - guess))
}

// Adds `deltaDays` calendar days to a Y/M/D triple (pure calendar math, no timezone/instant involved).
function addCalendarDays(year: number, month: number, day: number, deltaDays: number) {
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

function calendarWeekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function calculateDaysSinceContact(
  lastConnectDate: string | null
): number | null {
  if (!lastConnectDate) return null
  const dateOnly = lastConnectDate.split('T')[0]
  const today = zonedParts(new Date(), BUSINESS_TIMEZONE)
  const todayUTC = Date.UTC(today.year, today.month - 1, today.day)
  const [year, month, day] = dateOnly.split('-').map(Number)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  const lastUTC = Date.UTC(year, month - 1, day)
  const diffTime = todayUTC - lastUTC
  if (diffTime < 0) return 0
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

export function getTimeframeDates(timeframe: string, referenceDate = new Date()) {
  const today = zonedParts(referenceDate, BUSINESS_TIMEZONE)
  let startDate = { year: today.year, month: today.month, day: today.day }
  let endDate = { year: today.year, month: today.month, day: today.day }

  if (timeframe === 'this-week') {
    const weekday = calendarWeekday(today.year, today.month, today.day)
    const diff = -weekday + (weekday === 0 ? -6 : 1)
    startDate = addCalendarDays(today.year, today.month, today.day, diff)
  } else if (timeframe === 'last-week') {
    const weekday = calendarWeekday(today.year, today.month, today.day)
    const diffToLastMonday = -weekday - 6 + (weekday === 0 ? -6 : 1)
    startDate = addCalendarDays(today.year, today.month, today.day, diffToLastMonday)
    endDate = addCalendarDays(startDate.year, startDate.month, startDate.day, 6)
  } else if (timeframe === 'month-to-date' || timeframe === 'this-month') {
    startDate = { year: today.year, month: today.month, day: 1 }
  } else if (timeframe === 'this-year') {
    startDate = { year: today.year, month: 1, day: 1 }
  } else if (timeframe === 'all-time') {
    startDate = { year: 2020, month: 1, day: 1 }
  }
  // 'today' needs no adjustment - start/end already bracket today's date

  const start = zonedToUtc(startDate.year, startDate.month, startDate.day, 0, 0, 0, 0, BUSINESS_TIMEZONE)
  const end = zonedToUtc(endDate.year, endDate.month, endDate.day, 23, 59, 59, 999, BUSINESS_TIMEZONE)

  return { start, end }
}

// Returns `windowDays` consecutive calendar dates (oldest first), each with
// its ISO date string and a short "M/D" label, ending `endOffsetDays` days
// before today (business timezone). Used for daily-activity charts so they
// always show a meaningful trailing window instead of resetting to an empty
// chart every time a fixed calendar boundary (Monday, 1st of the month) passes.
export function getRollingDayBuckets(
  windowDays: number,
  referenceDate = new Date(),
  endOffsetDays = 0
): { date: string; label: string }[] {
  const today = zonedParts(referenceDate, BUSINESS_TIMEZONE)
  const buckets: { date: string; label: string }[] = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = addCalendarDays(today.year, today.month, today.day, -(i + endOffsetDays))
    const date = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
    buckets.push({ date, label: `${d.month}/${d.day}` })
  }
  return buckets
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
