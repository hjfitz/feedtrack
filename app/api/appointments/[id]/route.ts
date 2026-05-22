import { NextResponse } from 'next/server'
import { getHouseholdData, setHouseholdData } from '@/lib/server/blob-storage'
import { jsonError, parseDate, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import type { Appointment } from '@/lib/types'

type AppointmentUpdates = Partial<Omit<Appointment, 'id'>>

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const { id } = await params
  const body = await parseJsonBody<Record<string, unknown>>(request)
  const appointments = await getHouseholdData(householdId, 'appointments')
  const index = appointments.findIndex(appointment => appointment.id === id)

  if (index === -1) {
    return jsonError('Appointment not found', 404)
  }

  const updates: AppointmentUpdates = {}

  if (typeof body?.title === 'string') updates.title = body.title
  if (typeof body?.notes === 'string') updates.notes = body.notes
  if (typeof body?.isPast === 'boolean') updates.isPast = body.isPast
  if (body?.dateTime) {
    const dateTime = parseDate(body.dateTime)
    if (!dateTime) return jsonError('Valid appointment time is required')
    updates.dateTime = dateTime
  }

  appointments[index] = {
    ...appointments[index],
    ...updates,
  }
  appointments.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
  await setHouseholdData(householdId, 'appointments', appointments)

  return NextResponse.json(appointments.find(appointment => appointment.id === id))
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const { id } = await params
  const appointments = await getHouseholdData(householdId, 'appointments')
  await setHouseholdData(
    householdId,
    'appointments',
    appointments.filter(appointment => appointment.id !== id)
  )

  return NextResponse.json({ success: true })
}
