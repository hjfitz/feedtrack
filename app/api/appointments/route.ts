import { NextResponse } from 'next/server'
import { jsonError, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import { addAppointment, AppError, getAppointments } from '@/lib/server/tracker'

interface AppointmentBody {
  title?: string
  dateTime?: string
  notes?: string
  isPast?: boolean
}

export async function GET() {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  return NextResponse.json(await getAppointments(householdId))
}

export async function POST(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  try {
    return NextResponse.json(await addAppointment(householdId, await parseJsonBody<AppointmentBody>(request) || {}))
  } catch (error) {
    if (error instanceof AppError) return jsonError(error.message, error.status)
    throw error
  }
}
