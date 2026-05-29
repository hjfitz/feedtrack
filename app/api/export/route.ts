import { NextResponse } from 'next/server'
import { getHouseholdData } from '@/lib/server/blob-storage'
import { parseDate, requireHouseholdId } from '@/lib/server/http'
import { formatAppDate, formatAppTime } from '@/lib/timezone'

export async function GET(request: Request) {
  const { householdId, response } = await requireHouseholdId()
  if (response) return response

  const params = new URL(request.url).searchParams
  const start = parseDate(params.get('start')) || new Date(0)
  const end = parseDate(params.get('end')) || new Date()

  const [feeds, nappies, pumps] = await Promise.all([
    getHouseholdData(householdId, 'feeds'),
    getHouseholdData(householdId, 'nappies'),
    getHouseholdData(householdId, 'pumps'),
  ])

  const feedEntries = feeds
    .filter(feed => {
      const timestamp = new Date(feed.timestamp)
      return timestamp >= start && timestamp <= end
    })
    .map(feed => ({
      type: 'Feed' as const,
      timestamp: new Date(feed.timestamp),
      details: feed.type === 'breast'
        ? feed.volumeMl
          ? `Breast milk, ${feed.volumeMl} ml${feed.notes ? ' - ' + feed.notes : ''}`
          : `Breast, ${Math.round((feed.durationSeconds || 0) / 60)} min${feed.notes ? ' - ' + feed.notes : ''}`
        : `Formula, ${feed.volumeMl} ml${feed.notes ? ' - ' + feed.notes : ''}`,
    }))

  const nappyEntries = nappies
    .filter(nappy => {
      const timestamp = new Date(nappy.timestamp)
      return timestamp >= start && timestamp <= end
    })
    .map(nappy => ({
      type: 'Nappy' as const,
      timestamp: new Date(nappy.timestamp),
      details: `${nappy.type}${nappy.messSize ? ', ' + nappy.messSize + ' mess' : ''}${nappy.notes ? ' - ' + nappy.notes : ''}`,
    }))

  const pumpEntries = pumps
    .filter(pump => {
      const timestamp = new Date(pump.timestamp)
      return timestamp >= start && timestamp <= end
    })
    .map(pump => ({
      type: 'Pump' as const,
      timestamp: new Date(pump.timestamp),
      details: `${Math.round((pump.durationSeconds || 0) / 60)} min, ${pump.volumeMl ? `${pump.volumeMl} ml` : 'volume n/a'}${pump.notes ? ' - ' + pump.notes : ''}`,
    }))

  const lines = ['Type,Date,Time,Details']
  ;[...feedEntries, ...nappyEntries, ...pumpEntries]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .forEach(entry => {
      lines.push([
        entry.type,
        formatAppDate(entry.timestamp, { day: '2-digit', month: '2-digit', year: 'numeric' }),
        formatAppTime(entry.timestamp),
        `"${entry.details.replace(/"/g, '""')}"`,
      ].join(','))
    })

  return new NextResponse(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
    },
  })
}
