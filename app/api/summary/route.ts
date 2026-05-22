import { NextResponse } from 'next/server'
import { requireHouseholdId } from '@/lib/server/http'
import { getHoursSummary, getTodaySummary } from '@/lib/server/tracker'

export async function GET(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const params = new URL(request.url).searchParams
  const mode = params.get('mode')
  const hours = Number(params.get('hours') || 24)
  return NextResponse.json(mode === 'today'
    ? await getTodaySummary(householdId)
    : await getHoursSummary(householdId, hours)
  )
}
