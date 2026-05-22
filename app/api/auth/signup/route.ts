import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/server/auth'
import {
  getInvite,
  getUser,
  initializeHousehold,
  normalizeUsername,
  setInvite,
  setUser,
} from '@/lib/server/blob-storage'
import { jsonError, parseJsonBody } from '@/lib/server/http'

interface SignupBody {
  username?: string
  password?: string
}

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function createInviteCode() {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]
  }
  return code
}

async function createUniqueInviteCode() {
  let code = createInviteCode()
  while (await getInvite(code)) {
    code = createInviteCode()
  }
  return code
}

export async function POST(request: Request) {
  const body = await parseJsonBody<SignupBody>(request)
  const username = normalizeUsername(body?.username || '')
  const password = body?.password || ''

  if (username.length < 3) {
    return jsonError('Username must be at least 3 characters')
  }

  if (password.length < 6) {
    return jsonError('Password must be at least 6 characters')
  }

  const existingUser = await getUser(username)

  if (existingUser) {
    return jsonError('Username already taken', 409)
  }

  const householdId = randomUUID()
  const inviteCode = await createUniqueInviteCode()
  const hash = await bcrypt.hash(password, 12)

  await Promise.all([
    setUser(username, { id: householdId, hash, inviteCode }),
    setInvite(inviteCode, { householdId }),
    initializeHousehold(householdId, inviteCode),
  ])

  await setSessionCookie(householdId)

  return NextResponse.json({ householdId, inviteCode })
}
