import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'

const COOKIE_NAME = 'babytracker_session'
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30

function getJwtSecret() {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is required')
  }

  return new TextEncoder().encode(secret)
}

export async function signSession(householdId: string) {
  return new SignJWT({ sub: householdId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJwtSecret())
}

export async function setSessionCookie(householdId: string) {
  const token = await signSession(householdId)
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: THIRTY_DAYS_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function getSessionHouseholdId() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
