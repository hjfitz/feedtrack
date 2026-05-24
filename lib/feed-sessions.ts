import type { FeedEntry } from '@/lib/types'

export const FEED_SESSION_GAP_MINUTES = 30

export function feedSessionStarts(feeds: FeedEntry[]) {
  const sortedFeeds = [...feeds].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
  const sessionStarts: Date[] = []
  let previousFeedTime: number | null = null

  sortedFeeds.forEach(feed => {
    const timestamp = new Date(feed.timestamp)
    const feedTime = timestamp.getTime()
    if (!Number.isFinite(feedTime)) return

    if (
      previousFeedTime === null ||
      feedTime - previousFeedTime > FEED_SESSION_GAP_MINUTES * 60 * 1000
    ) {
      sessionStarts.push(timestamp)
    }
    previousFeedTime = feedTime
  })

  return sessionStarts
}
