import { AppShell } from '@/components/app-shell'
import { SettingsPanel } from '@/components/settings-panel'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import { requireSessionHouseholdId } from '@/lib/server/auth'

export default async function SettingsPage() {
  const householdId = await requireSessionHouseholdId()
  const meta = await getHouseholdMeta(householdId)

  return (
    <AppShell>
      <SettingsPanel inviteCode={meta?.inviteCode || null} />
    </AppShell>
  )
}
