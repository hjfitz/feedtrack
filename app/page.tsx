import { AppShell } from '@/components/app-shell'
import { DesktopHomePanel } from '@/components/desktop-home-panel'
import { HomePanel } from '@/components/home-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import { getAnalyticsPanelData } from '@/lib/server/analytics-data'
import { getHistoryDayData } from '@/lib/server/history-data'
import { getOverviewData } from '@/lib/server/tracker'
import { addAppDays, appDateKey, formatAppDate, parseAppDateKey, startOfAppDay } from '@/lib/timezone'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const householdId = await requireSessionHouseholdId()
  const params = await searchParams
  const meta = await getHouseholdMeta(householdId)
  const today = startOfAppDay()
  const todayKey = appDateKey(today)
  const fallbackMinDate = addAppDays(today, -60)
  const dobDate = meta?.babyDob ? parseAppDateKey(meta.babyDob) : null
  const minDate = dobDate && appDateKey(dobDate) <= todayKey ? dobDate : fallbackMinDate
  const minKey = appDateKey(minDate)
  const requestedDate = params.date ? parseAppDateKey(params.date) : null
  const selectedDate = requestedDate && appDateKey(requestedDate) >= minKey && appDateKey(requestedDate) <= todayKey ? requestedDate : today
  const selectedKey = appDateKey(selectedDate)
  const isToday = selectedKey === todayKey
  const previousKey = appDateKey(addAppDays(selectedDate, -1))
  const nextKey = appDateKey(addAppDays(selectedDate, 1))
  const dayNavigation = {
    label: isToday ? 'Today' : formatAppDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' }),
    selectedKey,
    isToday,
    previousHref: previousKey >= minKey ? `/?date=${previousKey}` : null,
    nextHref: isToday ? null : nextKey === todayKey ? '/' : `/?date=${nextKey}`,
    todayKey,
    minKey,
    historyHref: selectedKey === todayKey ? '/history?type=all&range=today' : `/history?type=all&date=${selectedKey}`,
  }
  const [data, historyData, analyticsData] = await Promise.all([
    getOverviewData(householdId, selectedDate),
    getHistoryDayData(householdId, selectedDate),
    getAnalyticsPanelData(householdId),
  ])

  return (
    <AppShell babyName={meta?.babyName} babyDob={meta?.babyDob}>
      <div className="lg:hidden">
        <HomePanel {...data} recentItems={historyData.items.slice(0, 4)} feedingIntervalMinutes={meta?.feedingIntervalMinutes} dayNavigation={dayNavigation} />
      </div>
      <DesktopHomePanel
        overview={data}
        history={historyData}
        analytics={analyticsData}
        feedingIntervalMinutes={meta?.feedingIntervalMinutes}
        dayNavigation={dayNavigation}
      />
    </AppShell>
  )
}
