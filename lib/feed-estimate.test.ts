import assert from 'node:assert/strict'
import test from 'node:test'
import {
  estimateNextFeed,
  formatNextFeedEstimate,
  groupFeedSessions,
} from './feed-estimate'
import type { FeedEntry, FeedType } from './types'

function feed(id: string, type: FeedType, timestamp: string, extra: Partial<FeedEntry> = {}): FeedEntry {
  return {
    id,
    type,
    timestamp: new Date(timestamp),
    ...extra,
  }
}

test('groups consecutive feeds into sessions using a 45 minute window', () => {
  const sessions = groupFeedSessions([
    feed('1', 'formula', '2026-05-23T12:00:00Z', { volumeMl: 90 }),
    feed('2', 'breast', '2026-05-23T11:20:00Z', { durationSeconds: 900 }),
    feed('3', 'formula', '2026-05-23T10:10:00Z', { volumeMl: 60 }),
  ])

  assert.equal(sessions.length, 2)
  assert.equal(sessions[0].feeds.length, 2)
  assert.equal(sessions[0].endTime, new Date('2026-05-23T12:00:00Z').getTime())
})

test('returns null when DOB is missing or there is not enough session history', () => {
  const feeds = [
    feed('1', 'formula', '2026-05-23T12:00:00Z', { volumeMl: 90 }),
    feed('2', 'formula', '2026-05-23T08:00:00Z', { volumeMl: 90 }),
  ]

  assert.equal(estimateNextFeed(feeds, undefined, new Date('2026-05-23T13:00:00Z')), null)
  assert.equal(estimateNextFeed(feeds.slice(0, 1), '2026-05-09', new Date('2026-05-23T13:00:00Z')), null)
})

test('uses the last five sessions for formula-only estimates', () => {
  const estimate = estimateNextFeed([
    feed('1', 'formula', '2026-05-23T12:00:00Z', { volumeMl: 90 }),
    feed('2', 'formula', '2026-05-23T08:00:00Z', { volumeMl: 90 }),
    feed('3', 'formula', '2026-05-23T04:30:00Z', { volumeMl: 90 }),
    feed('4', 'formula', '2026-05-23T01:00:00Z', { volumeMl: 90 }),
    feed('5', 'formula', '2026-05-22T21:00:00Z', { volumeMl: 90 }),
    feed('6', 'formula', '2026-05-22T17:00:00Z', { volumeMl: 90 }),
  ], '2026-04-01', new Date('2026-05-23T13:00:00Z'))

  assert.ok(estimate)
  assert.equal(estimate.latestSessionType, 'formula')
  assert.equal(estimate.sessionsUsed, 5)
  assert.equal(estimate.intervalMinutes, 225)
  assert.equal(estimate.minutesUntil, 165)
  assert.equal(estimate.status, 'next')
})

test('uses the last three sessions for mixed or breast-led estimates', () => {
  const estimate = estimateNextFeed([
    feed('1', 'formula', '2026-05-23T12:00:00Z', { volumeMl: 90 }),
    feed('2', 'breast', '2026-05-23T11:30:00Z', { durationSeconds: 900 }),
    feed('3', 'breast', '2026-05-23T08:00:00Z', { durationSeconds: 900 }),
    feed('4', 'formula', '2026-05-23T05:00:00Z', { volumeMl: 90 }),
    feed('5', 'formula', '2026-05-23T00:00:00Z', { volumeMl: 90 }),
  ], '2026-05-09', new Date('2026-05-23T13:00:00Z'))

  assert.ok(estimate)
  assert.equal(estimate.latestSessionType, 'mixed')
  assert.equal(estimate.sessionsUsed, 3)
  assert.equal(estimate.intervalMinutes, 220)
  assert.equal(estimate.minutesUntil, 160)
})

test('clamps long weighted gaps to the age-based ceiling', () => {
  const estimate = estimateNextFeed([
    feed('1', 'formula', '2026-05-23T12:00:00Z', { volumeMl: 90 }),
    feed('2', 'formula', '2026-05-23T04:00:00Z', { volumeMl: 90 }),
    feed('3', 'formula', '2026-05-22T20:00:00Z', { volumeMl: 90 }),
  ], '2026-05-09', new Date('2026-05-23T13:00:00Z'))

  assert.ok(estimate)
  assert.equal(estimate.intervalMinutes, 270)
  assert.equal(estimate.minutesUntil, 210)
})

test('formats next, due soon, and overdue estimates', () => {
  assert.equal(formatNextFeedEstimate({ status: 'next', minutesUntil: 95 }), 'next feed ~1h 35m')
  assert.equal(formatNextFeedEstimate({ status: 'due-soon', minutesUntil: 12 }), 'due soon · ~12m')
  assert.equal(formatNextFeedEstimate({ status: 'overdue', minutesUntil: -12 }), 'overdue · 12m ago')
})
