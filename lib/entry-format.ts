import type { FeedEntry, NappyEntry, PumpEntry } from '@/lib/types'

export type FeedKind = 'breast' | 'expressed' | 'formula'

export function formatDurationMinutesFromSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}m`
}

export function formatSummaryMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

export function feedKind(feed: FeedEntry): FeedKind {
  if (feed.type === 'formula') return 'formula'
  return feed.volumeMl ? 'expressed' : 'breast'
}

export function feedLabel(kind: FeedKind) {
  if (kind === 'expressed') return 'Breast milk'
  if (kind === 'breast') return 'Breast feed'
  return 'Formula'
}

export function feedAmount(feed: FeedEntry) {
  const kind = feedKind(feed)
  if (kind === 'breast') return formatDurationMinutesFromSeconds(feed.durationSeconds || 0)
  return `${feed.volumeMl || 0}ml`
}

export function formatFeedDetail(feed: FeedEntry) {
  if (feed.type === 'formula') return `Formula ${feed.volumeMl || 0}ml`
  if (feed.volumeMl) return `Breast milk ${feed.volumeMl}ml`
  return `Breast ${feed.durationSeconds ? formatDurationMinutesFromSeconds(feed.durationSeconds) : ''}`
}

export function formatPumpVolume(volumeMl?: number) {
  return volumeMl ? `${volumeMl}ml` : 'n/a'
}

export function formatPumpDetail(pump: PumpEntry) {
  return `${Math.round((pump.durationSeconds || 0) / 60)}m · ${formatPumpVolume(pump.volumeMl)}`
}

export function nappyLabel(nappy: Pick<NappyEntry, 'type'>) {
  return nappy.type === 'both' ? 'Wet + dirty' : nappy.type
}

export function formatNappyDetail(nappy: NappyEntry) {
  return `${nappyLabel(nappy)}${nappy.messSize ? ` · ${nappy.messSize}` : ''}`
}

export function entryTone(kind: FeedKind | NappyEntry['type']) {
  if (kind === 'breast') return 'text-sky-400'
  if (kind === 'expressed') return 'text-cyan-400'
  if (kind === 'formula') return 'text-amber-400'
  if (kind === 'wet') return 'text-blue-400'
  if (kind === 'dirty') return 'text-orange-400'
  return 'text-violet-400'
}
