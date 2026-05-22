import { NextResponse } from 'next/server'
import { requireHouseholdId } from '@/lib/server/http'
import { generateInviteCode } from '@/lib/server/tracker'

export async function POST() {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  return NextResponse.json({ inviteCode: await generateInviteCode(householdId) })
}
