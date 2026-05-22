import { NextResponse } from 'next/server'
import { jsonError, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import { AppError, deleteNappy, updateNappy } from '@/lib/server/tracker'
import type { NappyEntry } from '@/lib/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const { id } = await params
  try {
    return NextResponse.json(await updateNappy(householdId, id, await parseJsonBody<Partial<NappyEntry>>(request) || {}))
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
  await deleteNappy(householdId, id)

  return NextResponse.json({ success: true })
}
