import { NextResponse } from 'next/server'
import { jsonError, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import { addPump, AppError, getPumps, parseDate } from '@/lib/server/tracker'

interface PumpBody {
  timestamp?: string
  durationSeconds?: number
  volumeMl?: number
  notes?: string
}

export async function GET(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const since = parseDate(new URL(request.url).searchParams.get('since'))
  return NextResponse.json(await getPumps(householdId, since))
}

export async function POST(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  try {
    return NextResponse.json(await addPump(householdId, await parseJsonBody<PumpBody>(request) || {}))
  } catch (error) {
    if (error instanceof AppError) return jsonError(error.message, error.status)
    throw error
  }
}
