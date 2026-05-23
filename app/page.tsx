import { AppShell } from '@/components/app-shell'
import { HomePanel } from '@/components/home-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import { getOverviewData } from '@/lib/server/tracker'

export default async function HomePage() {
  const householdId = await requireSessionHouseholdId()
  const [data, meta] = await Promise.all([
    getOverviewData(householdId),
    getHouseholdMeta(householdId),
  ])

  return (
    <AppShell babyName={meta?.babyName} babyDob={meta?.babyDob}>
      <HomePanel {...data} babyDob={meta?.babyDob} />
    </AppShell>
  )
}
