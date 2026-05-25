import { AppShell } from '@/components/app-shell'
import { HistoryPanel } from '@/components/history-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import { getHistoryPanelData, validHistoryRange, validHistoryType } from '@/lib/server/history-data'

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; range?: string }>
}) {
  const householdId = await requireSessionHouseholdId()
  const params = await searchParams
  const type = validHistoryType(params.type)
  const range = validHistoryRange(params.range)
  const [historyData, meta] = await Promise.all([
    getHistoryPanelData(householdId, type, range),
    getHouseholdMeta(householdId),
  ])

  return (
    <AppShell babyName={meta?.babyName} babyDob={meta?.babyDob}>
      <HistoryPanel {...historyData} />
    </AppShell>
  )
}
