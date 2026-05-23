import type { FeedEntry } from '@/lib/types'

const FEED_SESSION_WINDOW_MINUTES = 45

export type FeedEstimateStatus = 'next' | 'due-soon' | 'overdue'
export type FeedSessionType = 'formula' | 'breast' | 'mixed'

export interface NextFeedEstimate {
  status: FeedEstimateStatus
  minutesUntil: number
  intervalMinutes: number
  sessionsUsed: number
  latestSessionType: FeedSessionType
}

interface FeedSession {
  endTime: number
  feeds: FeedEntry[]
}

function formatEstimateDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function ageBasedFeedCeilingMinutes(ageDays: number) {
  if (ageDays < 28) return 270
  if (ageDays < 84) return 300
  return 330
}

function sessionType(feeds: FeedEntry[]): FeedSessionType {
  const hasFormula = feeds.some(feed => feed.type === 'formula')
  const hasBreast = feeds.some(feed => feed.type === 'breast')
  if (hasFormula && hasBreast) return 'mixed'
  return hasFormula ? 'formula' : 'breast'
}

export function groupFeedSessions(feeds: FeedEntry[]) {
  const sortedFeeds = [...feeds]
    .map(feed => ({ feed, timestamp: new Date(feed.timestamp).getTime() }))
    .filter(entry => Number.isFinite(entry.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp)

  const sessions: FeedSession[] = []
  for (const entry of sortedFeeds) {
    const latestSession = sessions[sessions.length - 1]
    if (!latestSession) {
      sessions.push({ endTime: entry.timestamp, feeds: [entry.feed] })
      continue
    }

    const previousFeedTime = new Date(latestSession.feeds[latestSession.feeds.length - 1].timestamp).getTime()
    const gapMinutes = Math.round((previousFeedTime - entry.timestamp) / 60000)
    if (gapMinutes <= FEED_SESSION_WINDOW_MINUTES) {
      latestSession.feeds.push(entry.feed)
    } else {
      sessions.push({ endTime: entry.timestamp, feeds: [entry.feed] })
    }
  }

  return sessions
}

export function estimateNextFeed(recentFeeds: FeedEntry[], babyDob: string | undefined, now: Date): NextFeedEstimate | null {
  if (!babyDob || recentFeeds.length === 0) return null

  const birthDate = new Date(`${babyDob}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return null

  const sessions = groupFeedSessions(recentFeeds)
  const latestSession = sessions[0]
  if (!latestSession || sessions.length < 2) return null

  const latestSessionType = sessionType(latestSession.feeds)
  const sessionWindow = latestSessionType === 'formula' ? 5 : 3
  const sessionSample = sessions.slice(0, sessionWindow)
  const newestFirstGaps = sessionSample.slice(0, -1).map((session, index) => {
    const nextSession = sessionSample[index + 1]
    return Math.round((session.endTime - nextSession.endTime) / 60000)
  }).filter(gap => gap > 0)
  if (newestFirstGaps.length === 0) return null

  const oldestFirstGaps = [...newestFirstGaps].reverse()
  const weightedTotal = oldestFirstGaps.reduce((total, gap, index) => total + gap * (index + 1), 0)
  const weightTotal = oldestFirstGaps.reduce((total, _gap, index) => total + index + 1, 0)
  const ageDays = Math.max(0, Math.floor((now.getTime() - birthDate.getTime()) / (24 * 60 * 60 * 1000)))
  const intervalMinutes = Math.min(Math.round(weightedTotal / weightTotal), ageBasedFeedCeilingMinutes(ageDays))
  const minutesUntil = Math.round((latestSession.endTime + intervalMinutes * 60000 - now.getTime()) / 60000)
  const status: FeedEstimateStatus = minutesUntil < 0 ? 'overdue' : minutesUntil <= 30 ? 'due-soon' : 'next'

  return {
    status,
    minutesUntil,
    intervalMinutes,
    sessionsUsed: sessionSample.length,
    latestSessionType,
  }
}

export function formatNextFeedEstimate(estimate: Pick<NextFeedEstimate, 'status' | 'minutesUntil'>) {
  if (estimate.status === 'overdue') {
    return `overdue · ${formatEstimateDuration(Math.abs(estimate.minutesUntil))} ago`
  }
  if (estimate.status === 'due-soon') {
    return `due soon · ~${formatEstimateDuration(estimate.minutesUntil)}`
  }
  return `next feed ~${formatEstimateDuration(estimate.minutesUntil)}`
}
