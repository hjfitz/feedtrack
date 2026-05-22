import { NextResponse } from 'next/server'
import { jsonError, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import { addNappy, AppError, getNappies, parseDate } from '@/lib/server/tracker'

interface NappyBody {
  type?: 'wet' | 'dirty' | 'both'
  timestamp?: string
  notes?: string
}

export async function GET(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const since = parseDate(new URL(request.url).searchParams.get('since'))
  return NextResponse.json(await getNappies(householdId, since))
}

export async function POST(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  try {
    return NextResponse.json(await addNappy(householdId, await parseJsonBody<NappyBody>(request) || {}))
  } catch (error) {
    if (error instanceof AppError) return jsonError(error.message, error.status)
    throw error
  }
}
