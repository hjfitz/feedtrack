import { feedSessionStarts } from '@/lib/feed-sessions'
import type { DailySummary, FeedEntry, NappyEntry } from '@/lib/types'

export function calculateSummary(
  feeds: FeedEntry[],
  nappies: NappyEntry[],
  start: Date,
  end: Date,
  date: Date
): DailySummary {
  const feedsInRange = feeds.filter(feed => {
    const timestamp = new Date(feed.timestamp)
    return timestamp >= start && timestamp <= end
  })
  const nappiesInRange = nappies.filter(nappy => {
    const timestamp = new Date(nappy.timestamp)
    return timestamp >= start && timestamp <= end
  })
  const breastFeeds = feedsInRange.filter(feed => feed.type === 'breast')
  const formulaFeeds = feedsInRange.filter(feed => feed.type === 'formula')

  return {
    date,
    feedCount: feedsInRange.length,
    feedSessionCount: feedSessionStarts(feedsInRange).length,
    breastFeedCount: breastFeeds.length,
    formulaFeedCount: formulaFeeds.length,
    totalFormulaMl: formulaFeeds.reduce((sum, feed) => sum + (feed.volumeMl || 0), 0),
    totalBreastMinutes: Math.round(
      breastFeeds.reduce((sum, feed) => sum + (feed.durationSeconds || 0), 0) / 60
    ),
    totalBreastMilkMl: breastFeeds.reduce((sum, feed) => sum + (feed.volumeMl || 0), 0),
    nappyCount: nappiesInRange.length,
    wetCount: nappiesInRange.filter(nappy => nappy.type === 'wet' || nappy.type === 'both').length,
    dirtyCount: nappiesInRange.filter(nappy => nappy.type === 'dirty' || nappy.type === 'both').length,
  }
}
