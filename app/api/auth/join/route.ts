import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/server/auth'
import { getHouseholdMeta, getInvite, normalizeInviteCode } from '@/lib/server/blob-storage'
import { jsonError, parseJsonBody } from '@/lib/server/http'

interface JoinBody {
  inviteCode?: string
}

export async function POST(request: Request) {
  const body = await parseJsonBody<JoinBody>(request)
  const inviteCode = normalizeInviteCode(body?.inviteCode || '')

  if (inviteCode.length !== 8) {
    return jsonError('Invite code must be 8 characters')
  }

  const invite = await getInvite(inviteCode)

  if (!invite) {
    return jsonError('Invalid invite code', 404)
  }

  const meta = await getHouseholdMeta(invite.householdId)
  await setSessionCookie(invite.householdId)

  return NextResponse.json({
    householdId: invite.householdId,
    inviteCode: meta?.inviteCode || inviteCode,
  })
}
