import { feedSessionStarts } from '@/lib/feed-sessions'
import { getFeeds, getNappies } from '@/lib/server/tracker'
import { addAppDays, appDateKey, formatAppDate, startOfAppDay } from '@/lib/timezone'
import type { CategoryOption, FeedViewOption, RangeOption } from '@/components/analytics-panel'

const DAYS_TO_LOAD = 60

export interface AnalyticsDataPoint {
  date: string
  rawDate: string
  feedCount: number
  feedSessionCount: number
  formulaCount: number
  breastCount: number
  formulaMl: number
  breastMins: number
  breastMilkMl: number
  breastMilkCount: number
  wetOnly: number
  dirtyOnly: number
  both: number
  wetTotal: number
  dirtyTotal: number
  totalNappies: number
}

export function validAnalyticsRange(value: string | undefined): RangeOption {
  return value === '1d' || value === '30d' || value === '7d' ? value : '7d'
}

export function validAnalyticsCategory(value: string | undefined): CategoryOption {
  return value === 'nappies' || value === 'feeds' ? value : 'feeds'
}

export function validAnalyticsFeedView(value: string | undefined): FeedViewOption {
  return value === 'combined' || value === 'breast' || value === 'formula' ? value : 'combined'
}

function chartLabel(date: Date) {
  return formatAppDate(date, { month: 'short', day: 'numeric' })
}

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

function appHour(date: Date) {
  return Number(formatAppDate(date, { hour: '2-digit', hourCycle: 'h23' }))
}

function emptyPoint(date: string, rawDate: string): AnalyticsDataPoint {
  return {
    date,
    rawDate,
    feedCount: 0,
    feedSessionCount: 0,
    formulaCount: 0,
    breastCount: 0,
    formulaMl: 0,
    breastMins: 0,
    breastMilkMl: 0,
    breastMilkCount: 0,
    wetOnly: 0,
    dirtyOnly: 0,
    both: 0,
    wetTotal: 0,
    dirtyTotal: 0,
    totalNappies: 0,
  }
}

export async function getAnalyticsPanelData(householdId: string) {
  const since = new Date(Date.now() - DAYS_TO_LOAD * 24 * 60 * 60 * 1000)
  const [feeds, nappies] = await Promise.all([
    getFeeds(householdId, since),
    getNappies(householdId, since),
  ])

  const todayStart = startOfAppDay()
  const todayKey = appDateKey(todayStart)
  const dailyData = Array.from({ length: DAYS_TO_LOAD }, (_, index) => {
    const d = addAppDays(todayStart, -(DAYS_TO_LOAD - 1 - index))
    return emptyPoint(chartLabel(d), appDateKey(d))
  })
  const hourlyData = Array.from({ length: 24 }, (_, hour) => emptyPoint(hourLabel(hour), todayKey))
  const dayMap = new Map(dailyData.map(day => [day.rawDate, day]))
  const hourMap = new Map(hourlyData.map((hour, index) => [index, hour]))
  const feedSessionTimestamps: string[] = []

  feedSessionStarts(feeds).forEach(timestamp => {
    const dateKey = appDateKey(timestamp)
    const day = dayMap.get(dateKey)
    if (!day) return

    day.feedSessionCount += 1
    feedSessionTimestamps.push(timestamp.toISOString())

    const hour = dateKey === todayKey ? hourMap.get(appHour(timestamp)) : null
    if (hour) hour.feedSessionCount += 1
  })

  feeds.forEach(feed => {
    const timestamp = new Date(feed.timestamp)
    const dateKey = appDateKey(timestamp)
    const day = dayMap.get(dateKey)
    if (!day) return

    day.feedCount += 1

    const hour = dateKey === todayKey ? hourMap.get(appHour(timestamp)) : null
    if (hour) hour.feedCount += 1

    if (feed.type === 'breast') {
      day.breastCount += 1
      day.breastMins += Math.round((feed.durationSeconds || 0) / 60)
      day.breastMilkMl += feed.volumeMl || 0
      if (feed.volumeMl) day.breastMilkCount += 1
      if (hour) {
        hour.breastCount += 1
        hour.breastMins += Math.round((feed.durationSeconds || 0) / 60)
        hour.breastMilkMl += feed.volumeMl || 0
        if (feed.volumeMl) hour.breastMilkCount += 1
      }
    } else if (feed.type === 'formula') {
      day.formulaCount += 1
      day.formulaMl += feed.volumeMl || 0
      if (hour) {
        hour.formulaCount += 1
        hour.formulaMl += feed.volumeMl || 0
      }
    }
  })

  nappies.forEach(nappy => {
    const timestamp = new Date(nappy.timestamp)
    const dateKey = appDateKey(timestamp)
    const day = dayMap.get(dateKey)
    if (!day) return
    const hour = dateKey === todayKey ? hourMap.get(appHour(timestamp)) : null

    if (nappy.type === 'wet') {
      day.wetOnly += 1
      day.wetTotal += 1
      if (hour) {
        hour.wetOnly += 1
        hour.wetTotal += 1
      }
    } else if (nappy.type === 'dirty') {
      day.dirtyOnly += 1
      day.dirtyTotal += 1
      if (hour) {
        hour.dirtyOnly += 1
        hour.dirtyTotal += 1
      }
    } else if (nappy.type === 'both') {
      day.both += 1
      day.wetTotal += 1
      day.dirtyTotal += 1
      if (hour) {
        hour.both += 1
        hour.wetTotal += 1
        hour.dirtyTotal += 1
      }
    }
    day.totalNappies += 1
    if (hour) hour.totalNappies += 1
  })

  return {
    data: dailyData,
    hourlyData,
    feedSessionTimestamps,
  }
}
