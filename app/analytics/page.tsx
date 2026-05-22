import { AppShell } from '@/components/app-shell'
import { AnalyticsPanel } from '@/components/analytics-panel'
import { requireSessionHouseholdId } from '@/lib/server/auth'
import { getFeeds, getNappies } from '@/lib/server/tracker'

export default async function AnalyticsPage() {
  const householdId = await requireSessionHouseholdId()

  // Fetch the last 30 days of data to aggregate on the server
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [feeds, nappies] = await Promise.all([
    getFeeds(householdId, since),
    getNappies(householdId, since),
  ])

  // Aggregate daily records for the last 30 days
  const now = new Date()
  const dailyData: {
    date: string
    rawDate: string
    formulaMl: number
    breastMins: number
    wet: number
    dirty: number
    both: number
    totalNappies: number
  }[] = []

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    // Key used for grouping
    const rawDateStr = d.toDateString() 
    // Readable label on the chart
    const label = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    
    dailyData.push({
      date: label,
      rawDate: rawDateStr,
      formulaMl: 0,
      breastMins: 0,
      wet: 0,
      dirty: 0,
      both: 0,
      totalNappies: 0,
    })
  }

  feeds.forEach(feed => {
    const feedDateStr = new Date(feed.timestamp).toDateString()
    const day = dailyData.find(d => d.rawDate === feedDateStr)
    if (day) {
      if (feed.type === 'breast') {
        day.breastMins += Math.round((feed.durationSeconds || 0) / 60)
      } else if (feed.type === 'formula') {
        day.formulaMl += feed.volumeMl || 0
      }
    }
  })

  nappies.forEach(nappy => {
    const nappyDateStr = new Date(nappy.timestamp).toDateString()
    const day = dailyData.find(d => d.rawDate === nappyDateStr)
    if (day) {
      if (nappy.type === 'wet') {
        day.wet += 1
      } else if (nappy.type === 'dirty') {
        day.dirty += 1
      } else if (nappy.type === 'both') {
        day.both += 1
      }
      day.totalNappies += 1
    }
  })

  return (
    <AppShell>
      <AnalyticsPanel data={dailyData} />
    </AppShell>
  )
}
