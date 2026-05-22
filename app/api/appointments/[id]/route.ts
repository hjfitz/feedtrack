import { NextResponse } from 'next/server'
import { jsonError, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import { AppError, deleteAppointment, updateAppointment } from '@/lib/server/tracker'
import type { Appointment } from '@/lib/types'

type AppointmentUpdates = Partial<Omit<Appointment, 'id'>>

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const { id } = await params
  try {
    return NextResponse.json(await updateAppointment(householdId, id, await parseJsonBody<AppointmentUpdates>(request) || {}))
  } catch (error) {
    if (error instanceof AppError) return jsonError(error.message, error.status)
    throw error
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const { id } = await params
  await deleteAppointment(householdId, id)

  return NextResponse.json({ success: true })
}
