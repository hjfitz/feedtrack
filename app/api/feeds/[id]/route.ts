import { NextResponse } from 'next/server'
import { getHouseholdData, setHouseholdData } from '@/lib/server/blob-storage'
import { requireHouseholdId } from '@/lib/server/http'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const { id } = await params
  const feeds = await getHouseholdData(householdId, 'feeds')
  await setHouseholdData(householdId, 'feeds', feeds.filter(feed => feed.id !== id))

  return NextResponse.json({ success: true })
}
