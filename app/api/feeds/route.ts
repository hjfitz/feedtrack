import { NextResponse } from 'next/server'
import { getHouseholdData, setHouseholdData } from '@/lib/server/blob-storage'
import { generateId, jsonError, parseDate, parseJsonBody, requireHouseholdId } from '@/lib/server/http'
import type { FeedEntry } from '@/lib/types'

interface FeedBody {
  type?: 'breast' | 'formula'
  timestamp?: string
  side?: 'left' | 'right'
  durationSeconds?: number
  volumeMl?: number
}

export async function GET(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const since = parseDate(new URL(request.url).searchParams.get('since'))
  const feeds = await getHouseholdData(householdId, 'feeds')
  const filtered = since
    ? feeds.filter(feed => new Date(feed.timestamp).getTime() >= since.getTime())
    : feeds

  return NextResponse.json(filtered)
}

export async function POST(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const body = await parseJsonBody<FeedBody>(request)
  const timestamp = parseDate(body?.timestamp)

  if (body?.type !== 'breast' && body?.type !== 'formula') {
    return jsonError('Feed type is required')
  }

  if (!timestamp) {
    return jsonError('Valid timestamp is required')
  }

  const feed: FeedEntry = {
    id: generateId(),
    type: body.type,
    timestamp,
    side: body.side,
    durationSeconds: body.durationSeconds,
    volumeMl: body.volumeMl,
  }

  const feeds = await getHouseholdData(householdId, 'feeds')
  const nextFeeds = [feed, ...feeds]
  await setHouseholdData(householdId, 'feeds', nextFeeds)

  return NextResponse.json(feed)
}
