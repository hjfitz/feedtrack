import { NextResponse } from 'next/server'
import { getSessionHouseholdId } from '@/lib/server/auth'
import { getHouseholdMeta } from '@/lib/server/blob-storage'

export async function GET() {
  const householdId = await getSessionHouseholdId()

  if (!householdId) {
    return NextResponse.json({
      authenticated: false,
      householdId: null,
      inviteCode: null,
    })
  }

  const meta = await getHouseholdMeta(householdId)

  return NextResponse.json({
    authenticated: true,
    householdId,
    inviteCode: meta?.inviteCode || null,
  })
}
