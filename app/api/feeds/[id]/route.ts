import { NextResponse } from 'next/server'
import { jsonError, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import { AppError, deleteFeed, updateFeed } from '@/lib/server/tracker'
import type { FeedEntry } from '@/lib/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const { id } = await params
  try {
    return NextResponse.json(await updateFeed(householdId, id, await parseJsonBody<Partial<FeedEntry>>(request) || {}))
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
  await deleteFeed(householdId, id)

  return NextResponse.json({ success: true })
}
