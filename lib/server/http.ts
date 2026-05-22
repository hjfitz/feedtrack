import { NextResponse } from 'next/server'
import { getSessionHouseholdId } from '@/lib/server/auth'

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export async function requireHouseholdId() {
  const householdId = await getSessionHouseholdId()

  if (!householdId) {
    return { householdId: null, response: jsonError('Not authenticated', 401) }
  }

  return { householdId, response: null }
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function parseDate(value: unknown) {
  const date = typeof value === 'string' || value instanceof Date ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}
