'use client'

import { useState, useMemo } from 'react'
import { useFeeds, useNappies, useStorage } from '@/hooks/use-storage'
import type { FeedEntry, NappyEntry } from '@/lib/types'

type FilterType = 'all' | 'feeds' | 'nappies'
type TimeRange = 'today' | '12h' | '24h' | '7d'

interface HistoryItem {
  id: string
  type: 'feed' | 'nappy'
  timestamp: Date
  data: FeedEntry | NappyEntry
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  return `${mins}m`
}

function getTimeRangeStart(range: TimeRange): Date {
  const now = new Date()
  switch (range) {
    case 'today':
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      return today
    case '12h':
      return new Date(now.getTime() - 12 * 60 * 60 * 1000)
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
}

function FeedItem({ feed }: { feed: FeedEntry }) {
  const isBreast = feed.type === 'breast'
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        isBreast ? 'bg-sky-500/20' : 'bg-amber-500/20'
      }`}>
        {isBreast ? (
          <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {isBreast ? 'Breast feed' : 'Formula'}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTime(feed.timestamp)}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isBreast ? 'text-sky-400' : 'text-amber-400'}`}>
          {isBreast ? formatDuration(feed.durationSeconds || 0) : `${feed.volumeMl}ml`}
        </p>
      </div>
    </div>
  )
}

function NappyItem({ nappy }: { nappy: NappyEntry }) {
  const colors: Record<string, { bg: string; text: string }> = {
    wet: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    dirty: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    both: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  }
  const c = colors[nappy.type]
  
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${c.bg}`}>
        <svg className={`w-5 h-5 ${c.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground capitalize">
          {nappy.type === 'both' ? 'Wet & Dirty' : nappy.type} nappy
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTime(nappy.timestamp)}
        </p>
      </div>
      <div className={`text-sm font-semibold capitalize ${c.text}`}>
        {nappy.type}
      </div>
    </div>
  )
}

export function HistoryPanel() {
  const storage = useStorage()
  const { feeds } = useFeeds()
  const { nappies } = useNappies()
  
  const [filter, setFilter] = useState<FilterType>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('today')

  const rangeStart = getTimeRangeStart(timeRange)

  // Combine and filter items
  const items = useMemo(() => {
    const combined: HistoryItem[] = []
    
    if (filter === 'all' || filter === 'feeds') {
      feeds
        .filter(f => f.timestamp >= rangeStart)
        .forEach(f => combined.push({ id: f.id, type: 'feed', timestamp: f.timestamp, data: f }))
    }
    
    if (filter === 'all' || filter === 'nappies') {
      nappies
        .filter(n => n.timestamp >= rangeStart)
        .forEach(n => combined.push({ id: n.id, type: 'nappy', timestamp: n.timestamp, data: n }))
    }
    
    // Sort by timestamp descending
    combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    return combined
  }, [feeds, nappies, filter, rangeStart])

  // Group by date
  const groupedItems = useMemo(() => {
    const groups: { date: string; items: HistoryItem[] }[] = []
    let currentDate = ''
    
    items.forEach(item => {
      const dateStr = formatDate(item.timestamp)
      if (dateStr !== currentDate) {
        currentDate = dateStr
        groups.push({ date: dateStr, items: [] })
      }
      groups[groups.length - 1].items.push(item)
    })
    
    return groups
  }, [items])

  const handleExport = async () => {
    const csv = await storage.exportData('csv', rangeStart, new Date())
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `baby-tracker-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Type filter */}
        <div className="flex gap-2">
          {(['all', 'feeds', 'nappies'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        
        {/* Time range filter */}
        <div className="flex gap-2">
          {([
            { value: 'today', label: 'Today' },
            { value: '12h', label: '12h' },
            { value: '24h', label: '24h' },
            { value: '7d', label: '7 days' },
          ] as { value: TimeRange; label: string }[]).map(r => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === r.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {groupedItems.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No entries in this time range
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedItems.map(group => (
              <div key={group.date}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 sticky top-0 bg-background py-1">
                  {group.date}
                </p>
                <div className="rounded-xl bg-muted/30 px-4 divide-y divide-muted/50">
                  {group.items.map(item => (
                    item.type === 'feed' 
                      ? <FeedItem key={item.id} feed={item.data as FeedEntry} />
                      : <NappyItem key={item.id} nappy={item.data as NappyEntry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export button */}
      <button
        onClick={handleExport}
        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-muted text-foreground font-medium active:bg-muted/70 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Export CSV
      </button>
    </div>
  )
}
