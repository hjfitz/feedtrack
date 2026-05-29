'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Check, Download, Pencil, Trash2, X } from 'lucide-react'
import { deleteFeedAction, deleteNappyAction, deletePumpAction, updateFeedAction, updateNappyAction, updatePumpAction } from '@/app/actions/tracker'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { appDateKey, formatAppDate, formatAppDateTimeLocal, formatAppTime } from '@/lib/timezone'
import type { FeedEntry, NappyEntry, PumpEntry } from '@/lib/types'
import type { HistoryItem } from '@/lib/server/history-data'

export type FilterType = 'all' | 'feeds' | 'nappies' | 'pumps'
export type TimeRange = 'today' | '12h' | '24h' | '7d' | 'day'
const MESS_SIZES = [
  { value: '', label: 'n/a' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const

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

function formatPumpDetail(pump: PumpEntry) {
  return `${formatDuration(pump.durationSeconds)} · ${pump.volumeMl ? `${pump.volumeMl}ml` : 'n/a'}`
}

type FeedKind = 'breast' | 'expressed' | 'formula'

function feedKind(feed: FeedEntry): FeedKind {
  if (feed.type === 'formula') return 'formula'
  return feed.volumeMl ? 'expressed' : 'breast'
}

function feedLabel(kind: FeedKind) {
  if (kind === 'expressed') return 'Breast milk'
  if (kind === 'breast') return 'Breast feed'
  return 'Formula'
}

function feedTone(kind: FeedKind) {
  if (kind === 'expressed') return 'text-cyan-400'
  if (kind === 'breast') return 'text-sky-400'
  return 'text-amber-400'
}

function filterHref(type: FilterType, range: TimeRange, dateKey?: string) {
  if (range === 'day' && dateKey) return `/history?type=${type}&date=${dateKey}`
  return `/history?type=${type}&range=${range}`
}

function FeedItem({ feed }: { feed: FeedEntry }) {
  const [editing, setEditing] = useState(false)
  const [kind, setKind] = useState<FeedKind>(feedKind(feed))
  const [amount, setAmount] = useState(feed.volumeMl ? String(feed.volumeMl) : String(Math.round((feed.durationSeconds || 0) / 60)))
  const [timestamp, setTimestamp] = useState(formatAppDateTimeLocal(feed.timestamp))
  const [notes, setNotes] = useState(feed.notes || '')
  const [isPending, startTransition] = useTransition()
  const kindForFeed = feedKind(feed)
  const isBreast = kindForFeed === 'breast'
  const amountValue = Number(amount)
  const canSave = Number.isFinite(amountValue) && amountValue > 0 && timestamp
  const editType = kind === 'formula' ? 'formula' : 'breast'
  const editMeasure = kind === 'breast' ? 'duration' : 'volume'

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
        <input type="hidden" name="type" value={editType} />
        <input type="hidden" name="measure" value={editMeasure} />
        <input type="hidden" name="amount" value={amount} />
        <input type="hidden" name="timestamp" value={timestamp} />
        <input type="hidden" name="notes" value={notes} />
        <div className="grid grid-cols-3 gap-2">
          {(['breast', 'expressed', 'formula'] as FeedKind[]).map(option => (
            <button key={option} type="button" onClick={() => setKind(option)} disabled={isPending} className={`h-10 rounded-lg text-sm font-medium capitalize transition-colors ${kind === option ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} disabled:opacity-50 disabled:cursor-not-allowed`}>
              {option === 'expressed' ? 'Milk' : option}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_88px] gap-2">
          <input type="datetime-local" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} disabled={isPending} className="min-w-0 h-11 rounded-lg bg-background border border-border px-3 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed" />
          <div className="relative">
            <input type="number" inputMode="numeric" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={isPending} className="h-11 w-full rounded-lg bg-background border border-border px-3 pr-10 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{kind === 'breast' ? 'm' : 'ml'}</span>
          </div>
        </div>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isPending} rows={2} maxLength={280} placeholder="Optional note" className="rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed" />
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
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${kindForFeed === 'breast' ? 'bg-sky-500/20' : kindForFeed === 'expressed' ? 'bg-cyan-500/20' : 'bg-amber-500/20'}`}>
        <span className={`text-sm font-bold ${feedTone(kindForFeed)}`}>{kindForFeed === 'formula' ? 'F' : kindForFeed === 'expressed' ? 'M' : 'B'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{feedLabel(kindForFeed)}</p>
        <p className="text-xs text-muted-foreground">{formatTime(feed.timestamp)}{feed.notes ? ` · ${feed.notes}` : ''}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${feedTone(kindForFeed)}`}>{kindForFeed === 'breast' ? formatDuration(feed.durationSeconds || 0) : `${feed.volumeMl || 0}ml`}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <button type="button" onClick={() => setEditing(true)} className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Edit feed" title="Edit feed">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" disabled={isPending} className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Delete feed" title="Delete feed">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this feed?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the {feedLabel(kindForFeed).toLowerCase()} logged at {formatTime(feed.timestamp)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteFeedAction}>
                <input type="hidden" name="id" value={feed.id} />
                <AlertDialogAction type="submit" className="bg-red-500 text-white hover:bg-red-400">
                  Delete
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function NappyItem({ nappy }: { nappy: NappyEntry }) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState(nappy.type)
  const [timestamp, setTimestamp] = useState(formatAppDateTimeLocal(nappy.timestamp))
  const [messSize, setMessSize] = useState(nappy.messSize || '')
  const [notes, setNotes] = useState(nappy.notes || '')
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
        <input type="hidden" name="messSize" value={messSize} />
        <input type="hidden" name="notes" value={notes} />
        <div className="grid grid-cols-3 gap-2">
          {(['wet', 'dirty', 'both'] as const).map(option => (
            <button key={option} type="button" onClick={() => setType(option)} disabled={isPending} className={`h-10 rounded-lg text-sm font-medium capitalize transition-colors ${type === option ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} disabled:opacity-50 disabled:cursor-not-allowed`}>
              {option}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_260px]">
          <input type="datetime-local" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} disabled={isPending} className="h-11 rounded-lg bg-background border border-border px-3 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed" />
          <div className="grid grid-cols-4 gap-1">
            {MESS_SIZES.map(option => (
              <button key={option.value || 'none'} type="button" onClick={() => setMessSize(option.value)} disabled={isPending} className={`h-11 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${messSize === option.value ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isPending} rows={2} maxLength={280} placeholder="Optional note" className="rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed" />
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
        <p className="text-xs text-muted-foreground">{formatTime(nappy.timestamp)}{nappy.messSize ? ` · ${nappy.messSize} mess` : ''}{nappy.notes ? ` · ${nappy.notes}` : ''}</p>
      </div>
      <div className={`text-sm font-semibold capitalize ${c.text}`}>{nappy.type}</div>
      <div className="flex gap-1 shrink-0">
        <button type="button" onClick={() => setEditing(true)} className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Edit nappy" title="Edit nappy">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" disabled={isPending} className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Delete nappy" title="Delete nappy">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this nappy?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the {nappy.type === 'both' ? 'wet and dirty' : nappy.type} nappy logged at {formatTime(nappy.timestamp)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteNappyAction}>
                <input type="hidden" name="id" value={nappy.id} />
                <AlertDialogAction type="submit" className="bg-red-500 text-white hover:bg-red-400">
                  Delete
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function PumpItem({ pump }: { pump: PumpEntry }) {
  const [editing, setEditing] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(String(Math.round((pump.durationSeconds || 0) / 60)))
  const [volumeMl, setVolumeMl] = useState(pump.volumeMl ? String(pump.volumeMl) : '')
  const [timestamp, setTimestamp] = useState(formatAppDateTimeLocal(pump.timestamp))
  const [notes, setNotes] = useState(pump.notes || '')
  const [isPending, startTransition] = useTransition()
  const durationValue = Number(durationMinutes)
  const volumeValue = Number(volumeMl)
  const hasVolume = volumeMl.trim() !== ''
  const canSave = Number.isFinite(durationValue) && durationValue > 0 && (!hasVolume || (Number.isFinite(volumeValue) && volumeValue > 0)) && timestamp

  if (editing) {
    return (
      <form
        action={(formData) => {
          if (!canSave) return
          startTransition(async () => {
            await updatePumpAction(formData)
            setEditing(false)
          })
        }}
        className="py-3 flex flex-col gap-3"
      >
        <input type="hidden" name="id" value={pump.id} />
        <input type="hidden" name="durationMinutes" value={durationMinutes} />
        <input type="hidden" name="volumeMl" value={volumeMl} />
        <input type="hidden" name="timestamp" value={timestamp} />
        <input type="hidden" name="notes" value={notes} />
        <input type="datetime-local" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} disabled={isPending} className="h-11 rounded-lg bg-background border border-border px-3 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed" />
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input type="number" inputMode="numeric" min="1" step="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} disabled={isPending} className="h-11 w-full rounded-lg bg-background border border-border px-3 pr-12 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
          </div>
          <div className="relative">
            <input type="number" inputMode="numeric" min="1" step="1" value={volumeMl} onChange={(event) => setVolumeMl(event.target.value)} disabled={isPending} className="h-11 w-full rounded-lg bg-background border border-border px-3 pr-10 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed" placeholder="n/a" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ml</span>
          </div>
        </div>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isPending} rows={2} maxLength={280} placeholder="Optional note" className="rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} disabled={isPending} className="h-10 w-10 rounded-lg grid place-items-center text-muted-foreground bg-muted disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Cancel edit" title="Cancel edit">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="submit" disabled={!canSave || isPending} className="h-10 w-10 rounded-lg grid place-items-center text-white bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Save pump" title="Save pump">
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/20">
        <span className="text-sm font-bold text-emerald-400">P</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Pump session</p>
        <p className="text-xs text-muted-foreground">{formatTime(pump.timestamp)}{pump.notes ? ` · ${pump.notes}` : ''}</p>
      </div>
      <div className="text-sm font-semibold text-emerald-400 tabular-nums">{formatPumpDetail(pump)}</div>
      <div className="flex gap-1 shrink-0">
        <button type="button" onClick={() => setEditing(true)} className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Edit pump" title="Edit pump">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" disabled={isPending} className="h-9 w-9 rounded-lg grid place-items-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Delete pump" title="Delete pump">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this pump session?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the pump session logged at {formatTime(pump.timestamp)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deletePumpAction}>
                <input type="hidden" name="id" value={pump.id} />
                <AlertDialogAction type="submit" className="bg-red-500 text-white hover:bg-red-400">
                  Delete
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
  selectedDate,
  variant = 'full',
}: {
  items: HistoryItem[]
  groupedItems: { date: string; items: HistoryItem[] }[]
  type: FilterType
  range: TimeRange
  exportHref: string
  selectedDate?: { key: string; label: string }
  variant?: 'full' | 'compact'
}) {
  const isCompact = variant === 'compact'

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {isCompact ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
            <p className="text-sm text-muted-foreground">Last 24 hours</p>
          </div>
          <Link href="/history?type=all&range=24h" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Details
          </Link>
        </div>
      ) : <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(['all', 'feeds', 'nappies', 'pumps'] as FilterType[]).map(filter => (
            <Link key={filter} href={filterHref(filter, range, selectedDate?.key)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize text-center ${type === filter ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
              {filter}
            </Link>
          ))}
        </div>
        {selectedDate && (
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">Selected day</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selectedDate.label}</p>
          </div>
        )}
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
      </div>}

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
                    : item.type === 'nappy'
                      ? <NappyItem key={item.id} nappy={item.data as NappyEntry} />
                      : <PumpItem key={item.id} pump={item.data as PumpEntry} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isCompact && <a href={exportHref} className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-muted text-foreground font-medium active:bg-muted/70 transition-colors">
        <Download className="w-5 h-5" aria-hidden="true" />
        Export CSV
      </a>}
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
