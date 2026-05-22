import { AppShell } from '@/components/app-shell'
import { AppointmentsPanel } from '@/components/appointments-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getAppointments } from '@/lib/server/tracker'

export default async function AppointmentsPage() {
  const householdId = await requireSessionHouseholdId()
  const appointments = await getAppointments(householdId)
  const now = new Date()
  const upcoming = appointments.filter(appointment => !appointment.isPast && new Date(appointment.dateTime) >= now)
  const past = appointments.filter(appointment => appointment.isPast || new Date(appointment.dateTime) < now)

  return (
    <AppShell>
      <AppointmentsPanel upcoming={upcoming} past={past} />
    </AppShell>
  )
}
