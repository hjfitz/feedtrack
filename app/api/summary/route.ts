import { NextResponse } from 'next/server'
import { getHouseholdData } from '@/lib/server/blob-storage'
import { requireHouseholdId } from '@/lib/server/http'
import { calculateSummary } from '@/lib/server/summaries'

export async function GET(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const params = new URL(request.url).searchParams
  const mode = params.get('mode')
  const hours = Number(params.get('hours') || 24)
  const now = new Date()
  let start = new Date(now)

  if (mode === 'today') {
    start.setHours(0, 0, 0, 0)
  } else {
    start = new Date(now.getTime() - Math.max(hours, 1) * 60 * 60 * 1000)
  }

  const [feeds, nappies] = await Promise.all([
    getHouseholdData(householdId, 'feeds'),
    getHouseholdData(householdId, 'nappies'),
  ])

  return NextResponse.json(calculateSummary(feeds, nappies, start, now, now))
}
