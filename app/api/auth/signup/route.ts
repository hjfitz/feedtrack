import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/server/auth'
import { jsonError, parseJsonBody } from '@/lib/server/http'
import { AppError, signupUser } from '@/lib/server/tracker'

interface SignupBody {
  username?: string
  password?: string
  inviteCode?: string
}

export async function POST(request: Request) {
  const body = await parseJsonBody<SignupBody>(request)
  try {
    const result = await signupUser(body?.username || '', body?.password || '', body?.inviteCode)
    await setSessionCookie(result.householdId)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AppError) return jsonError(error.message, error.status)
    throw error
  }
}
