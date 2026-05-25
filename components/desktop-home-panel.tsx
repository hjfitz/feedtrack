import { AnalyticsPanel, type CategoryOption, type FeedViewOption, type RangeOption } from '@/components/analytics-panel'
import { HistoryPanel, type FilterType, type TimeRange } from '@/components/history-panel'
import { HomePanel } from '@/components/home-panel'
import type { AnalyticsDataPoint } from '@/lib/server/analytics-data'
import type { HistoryItem } from '@/lib/server/history-data'
import type { DailySummary, FeedEntry, NappyEntry } from '@/lib/types'

export function DesktopHomePanel({
  overview,
  history,
  analytics,
  feedingIntervalMinutes,
}: {
  overview: {
    lastFeed: FeedEntry | null
    lastNappy: NappyEntry | null
    summary: DailySummary
  }
  history: {
    items: HistoryItem[]
    groupedItems: { date: string; items: HistoryItem[] }[]
    type: FilterType
    range: TimeRange
    exportHref: string
  }
  analytics: {
    data: AnalyticsDataPoint[]
    hourlyData: AnalyticsDataPoint[]
    feedSessionTimestamps: string[]
    initialRange: RangeOption
    initialCategory: CategoryOption
    initialFeedView: FeedViewOption
  }
  feedingIntervalMinutes?: number
}) {
  return (
    <div className="hidden min-h-[calc(100vh-11rem)] grid-cols-[minmax(320px,380px)_minmax(380px,1fr)_minmax(320px,420px)] gap-5 lg:grid">
      <section className="min-h-0 rounded-xl border border-muted bg-muted/20 p-4">
        <HomePanel {...overview} feedingIntervalMinutes={feedingIntervalMinutes} />
      </section>
      <section className="min-h-0 rounded-xl border border-muted bg-muted/20 p-4">
        <HistoryPanel {...history} variant="compact" />
      </section>
      <section className="min-h-0 rounded-xl border border-muted bg-muted/20 p-4">
        <AnalyticsPanel {...analytics} variant="compact" />
      </section>
    </div>
  )
}
