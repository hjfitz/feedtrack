import { AppShell } from '@/components/app-shell'
import { HistoryPanel } from '@/components/history-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import { getFeeds, getNappies } from '@/lib/server/tracker'
import { appDateKey, formatAppDate, startOfAppDay } from '@/lib/timezone'
import type { FeedEntry, NappyEntry } from '@/lib/types'
import type { FilterType, TimeRange } from '@/components/history-panel'

interface HistoryItem {
  id: string
  type: 'feed' | 'nappy'
  timestamp: Date
  data: FeedEntry | NappyEntry
}

function validType(value: string | undefined): FilterType {
  return value === 'feeds' || value === 'nappies' || value === 'all' ? value : 'all'
}

function validRange(value: string | undefined): TimeRange {
  return value === '12h' || value === '24h' || value === '7d' || value === 'today' ? value : 'today'
}

function rangeStart(range: TimeRange) {
  const now = new Date()
  if (range === 'today') {
    return startOfAppDay(now)
  }
  if (range === '12h') return new Date(now.getTime() - 12 * 60 * 60 * 1000)
  if (range === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
}

function formatDate(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (appDateKey(date) === appDateKey(today)) return 'Today'
  if (appDateKey(date) === appDateKey(yesterday)) return 'Yesterday'
  return formatAppDate(date, { weekday: 'short', day: 'numeric', month: 'short' })
}

function groupItems(items: HistoryItem[]) {
  const groups: { date: string; items: HistoryItem[] }[] = []
  let currentDate = ''
  items.forEach(item => {
    const dateStr = formatDate(item.timestamp)
    if (dateStr !== currentDate) {
      currentDate = dateStr
      groups.push({ date: dateStr, items: [] })
    }
    groups[groups.length - 1].items.push(item)
  })
  return groups
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; range?: string }>
}) {
  const householdId = await requireSessionHouseholdId()
  const params = await searchParams
  const type = validType(params.type)
  const range = validRange(params.range)
  const start = rangeStart(range)
  const [feeds, nappies, meta] = await Promise.all([
    type === 'nappies' ? Promise.resolve([]) : getFeeds(householdId, start),
    type === 'feeds' ? Promise.resolve([]) : getNappies(householdId, start),
    getHouseholdMeta(householdId),
  ])
  const items: HistoryItem[] = [
    ...feeds.map(feed => ({ id: feed.id, type: 'feed' as const, timestamp: new Date(feed.timestamp), data: feed })),
    ...nappies.map(nappy => ({ id: nappy.id, type: 'nappy' as const, timestamp: new Date(nappy.timestamp), data: nappy })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  const exportHref = `/api/export?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(new Date().toISOString())}`

  return (
    <AppShell babyName={meta?.babyName} babyDob={meta?.babyDob}>
      <HistoryPanel
        items={items}
        groupedItems={groupItems(items)}
        type={type}
        range={range}
        exportHref={exportHref}
      />
    </AppShell>
  )
}
