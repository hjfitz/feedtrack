import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/server/auth'
import {
  getInvite,
  getHouseholdMeta,
  getUser,
  initializeHousehold,
  normalizeInviteCode,
  normalizeUsername,
  setInvite,
  setUser,
} from '@/lib/server/blob-storage'
import { jsonError, parseJsonBody } from '@/lib/server/http'

interface SignupBody {
  username?: string
  password?: string
  inviteCode?: string
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

  const requestedInviteCode = normalizeInviteCode(body?.inviteCode || '')
  const invite = requestedInviteCode ? await getInvite(requestedInviteCode) : null

  if (requestedInviteCode && requestedInviteCode.length !== 8) {
    return jsonError('Invite code must be 8 characters')
  }

  if (requestedInviteCode && !invite) {
    return jsonError('Invalid invite code', 404)
  }

  const householdId = invite?.householdId || randomUUID()
  const inviteCode = requestedInviteCode || await createUniqueInviteCode()
  const hash = await bcrypt.hash(password, 12)

  if (invite) {
    const meta = await getHouseholdMeta(householdId)
    await setUser(username, {
      id: householdId,
      hash,
      inviteCode: meta?.inviteCode || inviteCode,
    })
  } else {
    await Promise.all([
      setUser(username, { id: householdId, hash, inviteCode }),
      setInvite(inviteCode, { householdId }),
      initializeHousehold(householdId, inviteCode),
    ])
  }

  await setSessionCookie(householdId)

  return NextResponse.json({ householdId, inviteCode })
}
