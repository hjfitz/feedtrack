import { AppShell } from '@/components/app-shell'
import {
  AnalyticsPanel,
  type CategoryOption,
  type FeedViewOption,
  type RangeOption,
} from '@/components/analytics-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getFeeds, getNappies } from '@/lib/server/tracker'
import { addAppDays, appDateKey, formatAppDate, startOfAppDay } from '@/lib/timezone'

const DAYS_TO_LOAD = 60

function validRange(value: string | undefined): RangeOption {
  return value === '30d' || value === '7d' ? value : '7d'
}

function validCategory(value: string | undefined): CategoryOption {
  return value === 'nappies' || value === 'feeds' ? value : 'feeds'
}

function validFeedView(value: string | undefined): FeedViewOption {
  return value === 'combined' || value === 'breast' || value === 'formula' ? value : 'combined'
}

function chartLabel(date: Date) {
  return formatAppDate(date, { month: 'short', day: 'numeric' })
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; category?: string; feed?: string }>
}) {
  const householdId = await requireSessionHouseholdId()
  const params = await searchParams
  const initialRange = validRange(params.range)
  const initialCategory = validCategory(params.category)
  const initialFeedView = validFeedView(params.feed)

  const since = new Date(Date.now() - DAYS_TO_LOAD * 24 * 60 * 60 * 1000)
  const [feeds, nappies] = await Promise.all([
    getFeeds(householdId, since),
    getNappies(householdId, since),
  ])

  const todayStart = startOfAppDay()
  const dailyData = Array.from({ length: DAYS_TO_LOAD }, (_, index) => {
    const d = addAppDays(todayStart, -(DAYS_TO_LOAD - 1 - index))

    return {
      date: chartLabel(d),
      rawDate: appDateKey(d),
      feedCount: 0,
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
  })

  const dayMap = new Map(dailyData.map(day => [day.rawDate, day]))
  const feedTimestamps: string[] = []

  feeds.forEach(feed => {
    const day = dayMap.get(appDateKey(new Date(feed.timestamp)))
    if (!day) return

    day.feedCount += 1
    feedTimestamps.push(new Date(feed.timestamp).toISOString())

    if (feed.type === 'breast') {
      day.breastCount += 1
      day.breastMins += Math.round((feed.durationSeconds || 0) / 60)
      day.breastMilkMl += feed.volumeMl || 0
      if (feed.volumeMl) day.breastMilkCount += 1
    } else if (feed.type === 'formula') {
      day.formulaCount += 1
      day.formulaMl += feed.volumeMl || 0
    }
  })

  nappies.forEach(nappy => {
    const day = dayMap.get(appDateKey(new Date(nappy.timestamp)))
    if (!day) return

    if (nappy.type === 'wet') {
      day.wetOnly += 1
      day.wetTotal += 1
    } else if (nappy.type === 'dirty') {
      day.dirtyOnly += 1
      day.dirtyTotal += 1
    } else if (nappy.type === 'both') {
      day.both += 1
      day.wetTotal += 1
      day.dirtyTotal += 1
    }
    day.totalNappies += 1
  })

  return (
    <AppShell>
      <AnalyticsPanel
        data={dailyData}
        feedTimestamps={feedTimestamps}
        initialRange={initialRange}
        initialCategory={initialCategory}
        initialFeedView={initialFeedView}
      />
    </AppShell>
  )
}
