'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Check, Download, Pencil, Trash2, X } from 'lucide-react'
import { deleteFeedAction, deleteNappyAction, updateFeedAction, updateNappyAction } from '@/app/actions/tracker'
import { appDateKey, formatAppDate, formatAppDateTimeLocal, formatAppTime } from '@/lib/timezone'
import type { FeedEntry, NappyEntry } from '@/lib/types'

export type FilterType = 'all' | 'feeds' | 'nappies'
export type TimeRange = 'today' | '12h' | '24h' | '7d'

interface HistoryItem {
  id: string
  type: 'feed' | 'nappy'
  timestamp: Date
  data: FeedEntry | NappyEntry
}

function formatTime(date: Date): string {
  return formatAppTime(date)
}

function formatDate(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (appDateKey(date) === appDateKey(today)) return 'Today'
  if (appDateKey(date) === appDateKey(yesterday)) return 'Yesterday'
  return formatAppDate(date, { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}m`
}

function filterHref(type: FilterType, range: TimeRange) {
  return `/history?type=${type}&range=${range}`
}

function ActionIcon({
  label,
  children,
  pending,
}: {
  label: string
  children: React.ReactNode
  pending?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

function FeedItem({ feed }: { feed: FeedEntry }) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState(feed.type)
  const [amount, setAmount] = useState(feed.type === 'breast' ? String(Math.round((feed.durationSeconds || 0) / 60)) : String(feed.volumeMl || ''))
  const [timestamp, setTimestamp] = useState(formatAppDateTimeLocal(feed.timestamp))
  const [isPending, startTransition] = useTransition()
  const isBreast = feed.type === 'breast'
  const amountValue = Number(amount)
  const canSave = Number.isFinite(amountValue) && amountValue > 0 && timestamp

  if (editing) {
    return (
      <form
        action={(formData) => {
          if (!canSave) return
          startTransition(async () => {
            await updateFeedAction(formData)
            setEditing(false)
          })
        }}
        className="py-3 flex flex-col gap-3"
      >
        <input type="hidden" name="id" value={feed.id} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="timestamp" value={timestamp} />
        <div className="grid grid-cols-2 gap-2">
          {(['breast', 'formula'] as const).map(option => (
            <button key={option} type="button" onClick={() => setType(option)} disabled={isPending} className={`h-10 rounded-lg text-sm font-medium capitalize transition-colors ${type === option ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} disabled:opacity-50 disabled:cursor-not-allowed`}>
              {option}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_88px] gap-2">
          <input type="datetime-local" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} disabled={isPending} className="min-w-0 h-11 rounded-lg bg-background border border-border px-3 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed" />
          <div className="relative">
            <input type="number" inputMode="numeric" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={isPending} className="h-11 w-full rounded-lg bg-background border border-border px-3 pr-10 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{type === 'breast' ? 'm' : 'ml'}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} disabled={isPending} className="h-10 w-10 rounded-lg grid place-items-center text-muted-foreground bg-muted disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Cancel edit" title="Cancel edit">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="submit" disabled={!canSave || isPending} className="h-10 w-10 rounded-lg grid place-items-center text-white bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Save feed" title="Save feed">
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isBreast ? 'bg-sky-500/20' : 'bg-amber-500/20'}`}>
        <span className={`text-sm font-bold ${isBreast ? 'text-sky-400' : 'text-amber-400'}`}>{isBreast ? 'B' : 'F'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{isBreast ? 'Breast feed' : 'Formula'}</p>
        <p className="text-xs text-muted-foreground">{formatTime(feed.timestamp)}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isBreast ? 'text-sky-400' : 'text-amber-400'}`}>{isBreast ? formatDuration(feed.durationSeconds || 0) : `${feed.volumeMl}ml`}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button type="button" onClick={() => setEditing(true)} className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Edit feed" title="Edit feed">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <form action={deleteFeedAction}>
          <input type="hidden" name="id" value={feed.id} />
          <ActionIcon label="Delete feed" pending={isPending}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </ActionIcon>
        </form>
      </div>
    </div>
  )
}

function NappyItem({ nappy }: { nappy: NappyEntry }) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState(nappy.type)
  const [timestamp, setTimestamp] = useState(formatAppDateTimeLocal(nappy.timestamp))
  const [isPending, startTransition] = useTransition()
  const colors: Record<string, { bg: string; text: string }> = {
    wet: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    dirty: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    both: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  }
  const c = colors[nappy.type]

  if (editing) {
    return (
      <form
        action={(formData) => {
          startTransition(async () => {
            await updateNappyAction(formData)
            setEditing(false)
          })
        }}
        className="py-3 flex flex-col gap-3"
      >
        <input type="hidden" name="id" value={nappy.id} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="timestamp" value={timestamp} />
        <div className="grid grid-cols-3 gap-2">
          {(['wet', 'dirty', 'both'] as const).map(option => (
            <button key={option} type="button" onClick={() => setType(option)} disabled={isPending} className={`h-10 rounded-lg text-sm font-medium capitalize transition-colors ${type === option ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} disabled:opacity-50 disabled:cursor-not-allowed`}>
              {option}
            </button>
          ))}
        </div>
        <input type="datetime-local" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} disabled={isPending} className="h-11 rounded-lg bg-background border border-border px-3 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} disabled={isPending} className="h-10 w-10 rounded-lg grid place-items-center text-muted-foreground bg-muted disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Cancel edit" title="Cancel edit">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="submit" disabled={!timestamp || isPending} className="h-10 w-10 rounded-lg grid place-items-center text-white bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Save nappy" title="Save nappy">
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${c.bg}`}>
        <span className={`text-sm font-bold uppercase ${c.text}`}>{nappy.type[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground capitalize">{nappy.type === 'both' ? 'Wet & Dirty' : nappy.type} nappy</p>
        <p className="text-xs text-muted-foreground">{formatTime(nappy.timestamp)}</p>
      </div>
      <div className={`text-sm font-semibold capitalize ${c.text}`}>{nappy.type}</div>
      <div className="flex gap-1 shrink-0">
        <button type="button" onClick={() => setEditing(true)} className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Edit nappy" title="Edit nappy">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <form action={deleteNappyAction}>
          <input type="hidden" name="id" value={nappy.id} />
          <ActionIcon label="Delete nappy">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </ActionIcon>
        </form>
      </div>
    </div>
  )
}

export function HistoryPanel({
  items,
  groupedItems,
  type,
  range,
  exportHref,
}: {
  items: HistoryItem[]
  groupedItems: { date: string; items: HistoryItem[] }[]
  type: FilterType
  range: TimeRange
  exportHref: string
}) {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(['all', 'feeds', 'nappies'] as FilterType[]).map(filter => (
            <Link key={filter} href={filterHref(filter, range)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize text-center ${type === filter ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
              {filter}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          {[
            { value: 'today', label: 'Today' },
            { value: '12h', label: '12h' },
            { value: '24h', label: '24h' },
            { value: '7d', label: '7 days' },
          ].map(option => (
            <Link key={option.value} href={filterHref(type, option.value as TimeRange)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors text-center ${range === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No entries in this time range</div>
        ) : (
          <div className="flex flex-col gap-4">
            {groupedItems.map(group => (
              <div key={group.date}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 sticky top-0 bg-background py-1">{group.date}</p>
                <div className="rounded-xl bg-muted/30 px-4 divide-y divide-muted/50">
                  {group.items.map(item => item.type === 'feed'
                    ? <FeedItem key={item.id} feed={item.data as FeedEntry} />
                    : <NappyItem key={item.id} nappy={item.data as NappyEntry} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <a href={exportHref} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-muted text-foreground font-medium active:bg-muted/70 transition-colors">
        <Download className="w-5 h-5" aria-hidden="true" />
        Export CSV
      </a>
    </div>
  )
}

export function groupHistoryItems(items: HistoryItem[]) {
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
}
