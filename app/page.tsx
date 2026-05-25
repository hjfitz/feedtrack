import { AppShell } from '@/components/app-shell'
import { DesktopHomePanel } from '@/components/desktop-home-panel'
import { HomePanel } from '@/components/home-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import { getAnalyticsPanelData } from '@/lib/server/analytics-data'
import { getHistoryPanelData } from '@/lib/server/history-data'
import { getOverviewData } from '@/lib/server/tracker'

export default async function HomePage() {
  const householdId = await requireSessionHouseholdId()
  const [data, historyData, analyticsData, meta] = await Promise.all([
    getOverviewData(householdId),
    getHistoryPanelData(householdId, 'all', '24h'),
    getAnalyticsPanelData(householdId),
    getHouseholdMeta(householdId),
  ])

  return (
    <AppShell babyName={meta?.babyName} babyDob={meta?.babyDob}>
      <div className="lg:hidden">
        <HomePanel {...data} feedingIntervalMinutes={meta?.feedingIntervalMinutes} />
      </div>
      <DesktopHomePanel
        overview={data}
        history={historyData}
        analytics={{
          ...analyticsData,
          initialRange: '7d',
          initialCategory: 'feeds',
          initialFeedView: 'combined',
        }}
        feedingIntervalMinutes={meta?.feedingIntervalMinutes}
      />
    </AppShell>
  )
}
