import { NextResponse } from 'next/server'
import { getHouseholdData, setHouseholdData } from '@/lib/server/blob-storage'
import { generateId, jsonError, parseDate, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import type { Appointment } from '@/lib/types'

interface AppointmentBody {
  title?: string
  dateTime?: string
  notes?: string
  isPast?: boolean
}

export async function GET() {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const appointments = await getHouseholdData(householdId, 'appointments')
  appointments.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())

  return NextResponse.json(appointments)
}

export async function POST(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const body = await parseJsonBody<AppointmentBody>(request)
  const dateTime = parseDate(body?.dateTime)
  const title = body?.title?.trim()

  if (!title) {
    return jsonError('Appointment title is required')
  }

  if (!dateTime) {
    return jsonError('Valid appointment time is required')
  }

  const appointment: Appointment = {
    id: generateId(),
    title,
    dateTime,
    notes: body?.notes || undefined,
    isPast: Boolean(body?.isPast),
  }

  const appointments = await getHouseholdData(householdId, 'appointments')
  const nextAppointments = [...appointments, appointment]
  nextAppointments.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
  await setHouseholdData(householdId, 'appointments', nextAppointments)

  return NextResponse.json(appointment)
}
