import { AppShell } from '@/components/app-shell'
import { HistoryPanel } from '@/components/history-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import { getHistoryDayData, getHistoryPanelData, validHistoryRange, validHistoryType } from '@/lib/server/history-data'
import { addAppDays, appDateKey, formatAppDate, parseAppDateKey, startOfAppDay } from '@/lib/timezone'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; range?: string; date?: string }>
}) {
  const householdId = await requireSessionHouseholdId()
  const params = await searchParams
  const meta = await getHouseholdMeta(householdId)
  const pumpTrackingEnabled = meta?.pumpTrackingEnabled !== false
  const requestedType = validHistoryType(params.type)
  const type = !pumpTrackingEnabled && requestedType === 'pumps' ? 'all' : requestedType
  const today = startOfAppDay()
  const todayKey = appDateKey(today)
  const fallbackMinDate = addAppDays(today, -60)
  const dobDate = meta?.babyDob ? parseAppDateKey(meta.babyDob) : null
  const minDate = dobDate && appDateKey(dobDate) <= todayKey ? dobDate : fallbackMinDate
  const minKey = appDateKey(minDate)
  const requestedDate = params.date ? parseAppDateKey(params.date) : null
  const selectedDate = requestedDate && appDateKey(requestedDate) >= minKey && appDateKey(requestedDate) <= todayKey ? requestedDate : null
  const range = selectedDate ? 'day' : validHistoryRange(params.range)
  const historyData = selectedDate
    ? await getHistoryDayData(householdId, selectedDate, type)
    : await getHistoryPanelData(householdId, type, range)
  const selectedDateMeta = selectedDate
    ? {
      key: appDateKey(selectedDate),
      label: appDateKey(selectedDate) === todayKey ? 'Today' : formatAppDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' }),
    }
    : undefined

  return (
    <AppShell babyName={meta?.babyName} babyDob={meta?.babyDob}>
      <HistoryPanel {...historyData} selectedDate={selectedDateMeta} pumpTrackingEnabled={pumpTrackingEnabled} />
    </AppShell>
  )
}
