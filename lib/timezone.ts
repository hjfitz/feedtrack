export const APP_TIME_ZONE = 'Europe/London'

interface ZonedDateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getZonedParts(date: Date): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value ?? 0)
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  }
}

function timeZoneOffsetMs(date: Date) {
  const parts = getZonedParts(date)
  const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return zonedAsUtc - date.getTime()
}

export function zonedDateTimeToDate(parts: Omit<ZonedDateTimeParts, 'second'> & { second?: number }) {
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second ?? 0)
  const firstOffset = timeZoneOffsetMs(new Date(localAsUtc))
  const firstInstant = localAsUtc - firstOffset
  const secondOffset = timeZoneOffsetMs(new Date(firstInstant))
  return new Date(localAsUtc - secondOffset)
}

export function parseAppDateTimeLocal(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return null

  const [, year, month, day, hour, minute] = match
  const date = zonedDateTimeToDate({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  })

  return Number.isNaN(date.getTime()) ? null : date
}

export function parseAppDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const [, year, month, day] = match
  const date = zonedDateTimeToDate({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: 0,
    minute: 0,
  })

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatAppDateTimeLocal(date: Date) {
  const parts = getZonedParts(date)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

export function appDateKey(date: Date) {
  const parts = getZonedParts(date)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function formatAppDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: APP_TIME_ZONE, ...options }).format(date)
}

export function formatAppTime(date: Date) {
  return formatAppDate(date, { hour: '2-digit', minute: '2-digit' })
}

export function startOfAppDay(date = new Date()) {
  const parts = getZonedParts(date)
  return zonedDateTimeToDate({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
  })
}

export function addAppDays(date: Date, days: number) {
  const parts = getZonedParts(date)
  return zonedDateTimeToDate({
    year: parts.year,
    month: parts.month,
    day: parts.day + days,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  })
}
