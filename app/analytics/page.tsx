import { AppShell } from '@/components/app-shell'
import { AnalyticsPanel } from '@/components/analytics-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import {
  getAnalyticsPanelData,
  validAnalyticsCategory,
  validAnalyticsFeedView,
  validAnalyticsRange,
} from '@/lib/server/analytics-data'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; category?: string; feed?: string }>
}) {
  const householdId = await requireSessionHouseholdId()
  const params = await searchParams
  const [analyticsData, meta] = await Promise.all([
    getAnalyticsPanelData(householdId),
    getHouseholdMeta(householdId),
  ])

  return (
    <AppShell babyName={meta?.babyName} babyDob={meta?.babyDob}>
      <AnalyticsPanel
        {...analyticsData}
        initialRange={validAnalyticsRange(params.range)}
        initialCategory={validAnalyticsCategory(params.category)}
        initialFeedView={validAnalyticsFeedView(params.feed)}
      />
    </AppShell>
  )
}
