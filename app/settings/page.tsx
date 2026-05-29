import { AppShell } from '@/components/app-shell'
import { SettingsPanel } from '@/components/settings-panel'
import { getHouseholdMeta } from '@/lib/server/blob-storage'
import { requireSessionUser } from '@/lib/server/auth'

export default async function SettingsPage() {
  const session = await requireSessionUser()
  const householdId = session.householdId
  const meta = await getHouseholdMeta(householdId)

  return (
    <AppShell babyName={meta?.babyName} babyDob={meta?.babyDob}>
      <SettingsPanel
        inviteCode={meta?.inviteCode || null}
        babyName={meta?.babyName || ''}
        babyDob={meta?.babyDob || ''}
        feedingIntervalMinutes={meta?.feedingIntervalMinutes || ''}
        isAccountSession={Boolean(session.username)}
      />
    </AppShell>
  )
}
