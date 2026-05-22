import { AppShell } from '@/components/app-shell'
import { HomePanel } from '@/components/home-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getOverviewData } from '@/lib/server/tracker'

export default async function HomePage() {
  const householdId = await requireSessionHouseholdId()
  const data = await getOverviewData(householdId)

  return (
    <AppShell>
      <HomePanel {...data} />
    </AppShell>
  )
}
