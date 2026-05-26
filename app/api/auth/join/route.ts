import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/server/auth'
import { jsonError, parseJsonBody } from '@/lib/server/http'
import { AppError, joinHouseholdWithInvite } from '@/lib/server/tracker'

interface JoinBody {
  inviteCode?: string
}

export async function POST(request: Request) {
  const body = await parseJsonBody<JoinBody>(request)
  try {
    const result = await joinHouseholdWithInvite(body?.inviteCode || '')
    await setSessionCookie(result.householdId)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AppError) return jsonError(error.message, error.status)
    throw error
  }
}
