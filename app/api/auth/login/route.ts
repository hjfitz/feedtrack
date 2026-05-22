import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/server/auth'
import { jsonError, parseJsonBody } from '@/lib/server/http'
import { AppError, loginUser } from '@/lib/server/tracker'

interface LoginBody {
  username?: string
  password?: string
}

export async function POST(request: Request) {
  const body = await parseJsonBody<LoginBody>(request)
  try {
    const result = await loginUser(body?.username || '', body?.password || '')
    await setSessionCookie(result.householdId)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AppError) return jsonError(error.message, error.status)
    throw error
  }
}
