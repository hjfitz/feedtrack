import { NextResponse } from 'next/server'
import { getHouseholdData, setHouseholdData } from '@/lib/server/blob-storage'
import { generateId, jsonError, parseDate, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import type { NappyEntry } from '@/lib/types'

interface NappyBody {
  type?: 'wet' | 'dirty' | 'both'
  timestamp?: string
  notes?: string
}

export async function GET(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const since = parseDate(new URL(request.url).searchParams.get('since'))
  const nappies = await getHouseholdData(householdId, 'nappies')
  const filtered = since
    ? nappies.filter(nappy => new Date(nappy.timestamp).getTime() >= since.getTime())
    : nappies

  return NextResponse.json(filtered)
}

export async function POST(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const body = await parseJsonBody<NappyBody>(request)
  const timestamp = parseDate(body?.timestamp)

  if (body?.type !== 'wet' && body?.type !== 'dirty' && body?.type !== 'both') {
    return jsonError('Nappy type is required')
  }

  if (!timestamp) {
    return jsonError('Valid timestamp is required')
  }

  const nappy: NappyEntry = {
    id: generateId(),
    type: body.type,
    timestamp,
    notes: body.notes || undefined,
  }

  const nappies = await getHouseholdData(householdId, 'nappies')
  const nextNappies = [nappy, ...nappies]
  await setHouseholdData(householdId, 'nappies', nextNappies)

  return NextResponse.json(nappy)
}
