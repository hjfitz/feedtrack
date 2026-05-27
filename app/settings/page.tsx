import { AppShell } from '@/components/app-shell'
import { SettingsPanel } from '@/components/settings-panel'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import { requireSessionHouseholdId } from '@/lib/server/auth'

export default async function SettingsPage() {
  const householdId = await requireSessionHouseholdId()
  const meta = await getHouseholdMeta(householdId)

  return (
    <AppShell babyName={meta?.babyName} babyDob={meta?.babyDob}>
      <SettingsPanel
        inviteCode={meta?.inviteCode || null}
        babyName={meta?.babyName || ''}
        babyDob={meta?.babyDob || ''}
        feedingIntervalMinutes={meta?.feedingIntervalMinutes || ''}
        hasSignInAccount={Boolean(meta?.hasSignInAccount)}
      />
    </AppShell>
  )
}
