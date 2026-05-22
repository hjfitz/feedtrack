import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/server/auth'
import { getUser, normalizeUsername } from '@/lib/server/blob-storage'
import { jsonError, parseJsonBody } from '@/lib/server/http'

interface LoginBody {
  username?: string
  password?: string
}

export async function POST(request: Request) {
  const body = await parseJsonBody<LoginBody>(request)
  const username = normalizeUsername(body?.username || '')
  const password = body?.password || ''

  if (!username || !password) {
    return jsonError('Username and password are required')
  }

  const user = await getUser(username)

  if (!user) {
    return jsonError('User not found', 404)
  }

  const matches = await bcrypt.compare(password, user.hash)

  if (!matches) {
    return jsonError('Incorrect password', 401)
  }

  await setSessionCookie(user.id)

  return NextResponse.json({ householdId: user.id, inviteCode: user.inviteCode })
}
