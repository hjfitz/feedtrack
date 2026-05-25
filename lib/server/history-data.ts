import { getFeeds, getNappies, getPumps } from '@/lib/server/tracker'
import { appDateKey, formatAppDate, startOfAppDay } from '@/lib/timezone'
import type { FeedEntry, NappyEntry, PumpEntry } from '@/lib/types'
import type { FilterType, TimeRange } from '@/components/history-panel'

export interface HistoryItem {
  id: string
  type: 'feed' | 'nappy' | 'pump'
  timestamp: Date
  data: FeedEntry | NappyEntry | PumpEntry
}

export function validHistoryType(value: string | undefined): FilterType {
  return value === 'feeds' || value === 'nappies' || value === 'pumps' || value === 'all' ? value : 'all'
}

export function validHistoryRange(value: string | undefined): TimeRange {
  return value === '12h' || value === '24h' || value === '7d' || value === 'today' ? value : 'today'
}

export function historyRangeStart(range: TimeRange) {
  const now = new Date()
  if (range === 'today') {
    return startOfAppDay(now)
  }
  if (range === '12h') return new Date(now.getTime() - 12 * 60 * 60 * 1000)
  if (range === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
}

function formatHistoryDate(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (appDateKey(date) === appDateKey(today)) return 'Today'
  if (appDateKey(date) === appDateKey(yesterday)) return 'Yesterday'
  return formatAppDate(date, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function groupHistoryItems(items: HistoryItem[]) {
  const groups: { date: string; items: HistoryItem[] }[] = []
  let currentDate = ''
  items.forEach(item => {
    const dateStr = formatHistoryDate(item.timestamp)
    if (dateStr !== currentDate) {
      currentDate = dateStr
      groups.push({ date: dateStr, items: [] })
    }
    groups[groups.length - 1].items.push(item)
  })
  return groups
}

export async function getHistoryPanelData(householdId: string, type: FilterType, range: TimeRange) {
  const start = historyRangeStart(range)
  const [feeds, nappies, pumps] = await Promise.all([
    type === 'nappies' || type === 'pumps' ? Promise.resolve([]) : getFeeds(householdId, start),
    type === 'feeds' || type === 'pumps' ? Promise.resolve([]) : getNappies(householdId, start),
    type === 'feeds' || type === 'nappies' ? Promise.resolve([]) : getPumps(householdId, start),
  ])
  const items: HistoryItem[] = [
    ...feeds.map(feed => ({ id: feed.id, type: 'feed' as const, timestamp: new Date(feed.timestamp), data: feed })),
    ...nappies.map(nappy => ({ id: nappy.id, type: 'nappy' as const, timestamp: new Date(nappy.timestamp), data: nappy })),
    ...pumps.map(pump => ({ id: pump.id, type: 'pump' as const, timestamp: new Date(pump.timestamp), data: pump })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  const exportHref = `/api/export?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(new Date().toISOString())}`

  return {
    items,
    groupedItems: groupHistoryItems(items),
    type,
    range,
    exportHref,
  }
}
