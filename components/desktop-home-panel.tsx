'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Check, Droplets, Pencil, Trash2, X } from 'lucide-react'
import {
  addFeedAction,
  addNappyAction,
  addPumpAction,
  deleteFeedAction,
  deleteNappyAction,
  deletePumpAction,
  updateFeedAction,
  updateNappyAction,
  updatePumpAction,
} from '@/app/actions/tracker'
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
import { formatAppDateTimeLocal, formatAppTime } from '@/lib/timezone'
import type { AnalyticsDataPoint } from '@/lib/server/analytics-data'
import type { HistoryItem } from '@/lib/server/history-data'
import type { DailySummary, FeedEntry, NappyEntry, PumpEntry } from '@/lib/types'

const BREAST_PRESETS = [5, 10, 15, 20, 25, 30]
const BOTTLE_PRESETS = [30, 60, 90, 120, 150, 180]

type FeedKind = 'breast' | 'expressed' | 'formula'

function formatTimeSince(date: Date | null, now: Date): string {
  if (!date) return '--'
  const diffMins = Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 60000))
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}h ${mins}m`
}

function formatSummaryMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function nextFeedEstimate(lastFeed: FeedEntry | null, feedingIntervalMinutes: number | undefined, now: Date) {
  if (!lastFeed || !feedingIntervalMinutes) return ''
  const lastFeedTime = new Date(lastFeed.timestamp).getTime()
  if (!Number.isFinite(lastFeedTime)) return ''

  const minutesUntil = Math.round((lastFeedTime + feedingIntervalMinutes * 60000 - now.getTime()) / 60000)
  if (minutesUntil < 0) return `Overdue by ${formatSummaryMinutes(Math.abs(minutesUntil))}`
  if (minutesUntil <= 30) return `Due soon, about ${formatSummaryMinutes(minutesUntil)}`
  return `Next feed in about ${formatSummaryMinutes(minutesUntil)}`
}

function feedKind(feed: FeedEntry): FeedKind {
  if (feed.type === 'formula') return 'formula'
  return feed.volumeMl ? 'expressed' : 'breast'
}

function feedLabel(kind: FeedKind) {
  if (kind === 'expressed') return 'Expressed feed'
  if (kind === 'breast') return 'Breast feed'
  return 'Formula'
}

function feedAmount(feed: FeedEntry) {
  const kind = feedKind(feed)
  if (kind === 'breast') return `${Math.floor((feed.durationSeconds || 0) / 60)}m`
  return `${feed.volumeMl || 0}ml`
}

function nappyLabel(nappy: NappyEntry) {
  return nappy.type === 'both' ? 'Wet + dirty' : nappy.type
}

function pumpDetail(pump: PumpEntry) {
  return `${Math.round((pump.durationSeconds || 0) / 60)}m · ${pump.volumeMl ? `${pump.volumeMl}ml` : 'n/a'}`
}

function tone(kind: FeedKind | NappyEntry['type']) {
  if (kind === 'breast') return 'text-sky-400'
  if (kind === 'expressed') return 'text-cyan-400'
  if (kind === 'formula') return 'text-amber-400'
  if (kind === 'wet') return 'text-blue-400'
  if (kind === 'dirty') return 'text-orange-400'
  return 'text-violet-400'
}

function StatTile({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-muted/60 bg-muted/20 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-nowrap text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {helper && <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

function SummaryTile({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-muted/50 bg-background/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${className}`}>{value}</p>
    </div>
  )
}

function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-10 rounded-lg border border-muted/60 bg-background/70 px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  )
}

function FeedLogSection({
  title,
  helper,
  accent,
  presets,
  unit,
  disabled,
  timestamp,
  onLog,
}: {
  title: string
  helper: string
  accent: string
  presets: number[]
  unit: string
  disabled: boolean
  timestamp: string
  onLog: (value: number) => void
}) {
  const [custom, setCustom] = useState('')
  const customValue = Number(custom)
  const canLogCustom = Number.isFinite(customValue) && customValue > 0 && Boolean(timestamp) && !disabled

  return (
    <div className="rounded-lg border border-muted/60 bg-muted/15 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className={`text-sm font-semibold ${accent}`}>{title}</h3>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{unit}</span>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {presets.map(value => (
          <ActionButton key={value} disabled={!timestamp || disabled} onClick={() => onLog(value)}>
            {value}
          </ActionButton>
        ))}
      </div>
      <form
        className="mt-3 grid grid-cols-[1fr_auto] gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canLogCustom) return
          onLog(customValue)
          setCustom('')
        }}
      >
        <div className="relative">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            disabled={disabled}
            placeholder="Custom"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-11 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-45"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
        </div>
        <button
          type="submit"
          disabled={!canLogCustom}
          className="h-10 rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Log
        </button>
      </form>
    </div>
  )
}

function PumpLogSection({
  disabled,
  timestamp,
  onLog,
}: {
  disabled: boolean
  timestamp: string
  onLog: (durationMinutes: number, volumeMl?: number) => void
}) {
  const [durationMinutes, setDurationMinutes] = useState('20')
  const [volumeMl, setVolumeMl] = useState('90')
  const durationValue = Number(durationMinutes)
  const volumeValue = Number(volumeMl)
  const hasVolume = volumeMl.trim() !== ''
  const canLog = Number.isFinite(durationValue) && durationValue > 0 && (!hasVolume || (Number.isFinite(volumeValue) && volumeValue > 0)) && Boolean(timestamp) && !disabled

  return (
    <div className="rounded-lg border border-muted/60 bg-muted/15 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-emerald-400">Pump</h3>
          <p className="text-xs text-muted-foreground">Total time and volume</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">min + ml</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-12 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-45"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
        </div>
        <div className="relative">
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={volumeMl}
            onChange={(event) => setVolumeMl(event.target.value)}
            disabled={disabled}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-45"
            placeholder="n/a"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ml</span>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVolumeMl('')}
        className={`mt-2 h-9 w-full rounded-lg border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${volumeMl === '' ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'}`}
      >
        Volume n/a
      </button>
      <button
        type="button"
        disabled={!canLog}
        onClick={() => onLog(durationValue, hasVolume ? volumeValue : undefined)}
        className="mt-3 h-10 w-full rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-45"
      >
        Log pump
      </button>
    </div>
  )
}

function DesktopQuickLog({
  pending,
  onLogFeed,
  onLogNappy,
  onLogPump,
}: {
  pending: boolean
  onLogFeed: (kind: FeedKind, amount: number, timestamp: string) => void
  onLogNappy: (type: NappyEntry['type'], timestamp: string) => void
  onLogPump: (durationMinutes: number, volumeMl: number | undefined, timestamp: string) => void
}) {
  const [timestamp, setTimestamp] = useState(() => formatAppDateTimeLocal(new Date()))

  return (
    <section className="rounded-xl border border-muted bg-muted/10 p-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Quick log</h2>
          <p className="text-sm text-muted-foreground">Inline desktop entry for the common actions.</p>
        </div>
        <label className="flex min-w-[230px] flex-col gap-1 text-xs text-muted-foreground">
          Timestamp
          <input
            type="datetime-local"
            value={timestamp}
            onChange={(event) => setTimestamp(event.target.value)}
            disabled={pending}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-45"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <FeedLogSection
          title="Breast"
          helper="Duration"
          accent="text-sky-400"
          presets={BREAST_PRESETS}
          unit="min"
          timestamp={timestamp}
          disabled={pending}
          onLog={(value) => onLogFeed('breast', value, timestamp)}
        />
        <FeedLogSection
          title="Milk"
          helper="Expressed feed"
          accent="text-cyan-400"
          presets={BOTTLE_PRESETS}
          unit="ml"
          timestamp={timestamp}
          disabled={pending}
          onLog={(value) => onLogFeed('expressed', value, timestamp)}
        />
        <FeedLogSection
          title="Formula"
          helper="Bottle volume"
          accent="text-amber-400"
          presets={BOTTLE_PRESETS}
          unit="ml"
          timestamp={timestamp}
          disabled={pending}
          onLog={(value) => onLogFeed('formula', value, timestamp)}
        />
        <PumpLogSection disabled={pending} timestamp={timestamp} onLog={(duration, volume) => onLogPump(duration, volume, timestamp)} />
      </div>

      <div className="mt-3 rounded-lg border border-muted/60 bg-muted/15 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-violet-400">Nappies</h3>
            <p className="text-xs text-muted-foreground">Log a change with the same timestamp.</p>
          </div>
          <Droplets className="h-4 w-4 text-violet-400" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['wet', 'dirty', 'both'] as const).map(type => (
            <ActionButton key={type} disabled={!timestamp || pending} onClick={() => onLogNappy(type, timestamp)}>
              {type === 'both' ? 'Wet + dirty' : type}
            </ActionButton>
          ))}
        </div>
      </div>
    </section>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value?: number; name?: string; color?: string; fill?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-card/95 px-3 py-2 text-sm shadow-xl">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      {payload.map(item => (
        <p key={item.name} className="font-semibold text-foreground">
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  )
}

function CompactAnalytics({ data }: { data: AnalyticsDataPoint[] }) {
  const chartData = data.slice(-7)
  const totals = chartData.reduce(
    (sum, day) => ({
      sessions: sum.sessions + day.feedSessionCount,
      formulaMl: sum.formulaMl + day.formulaMl,
      breastMins: sum.breastMins + day.breastMins,
      pumpMl: sum.pumpMl + day.pumpMl,
      nappies: sum.nappies + day.totalNappies,
    }),
    { sessions: 0, formulaMl: 0, breastMins: 0, pumpMl: 0, nappies: 0 },
  )

  return (
    <section className="rounded-xl border border-muted bg-muted/10 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Patterns</h2>
          <p className="text-sm text-muted-foreground">Last 7 days</p>
        </div>
        <a href="/analytics" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Details
        </a>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SummaryTile label="Sessions" value={String(totals.sessions)} className="text-emerald-400" />
        <SummaryTile label="Nappies" value={String(totals.nappies)} className="text-violet-400" />
        <SummaryTile label="Formula" value={`${totals.formulaMl}ml`} className="text-amber-400" />
        <SummaryTile label="Breast" value={`${totals.breastMins}m`} className="text-sky-400" />
        <SummaryTile label="Pumped" value={`${totals.pumpMl}ml`} className="text-emerald-400" />
      </div>
      <div className="mt-4 h-52 rounded-lg border border-muted/50 bg-background/40 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" stroke="currentColor" className="text-muted-foreground" tickLine={false} />
            <YAxis allowDecimals={false} stroke="currentColor" className="text-muted-foreground" tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="feedSessionCount" name="Sessions" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function FeedActivityRow({ feed, onChanged }: { feed: FeedEntry; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [kind, setKind] = useState<FeedKind>(feedKind(feed))
  const [amount, setAmount] = useState(feed.volumeMl ? String(feed.volumeMl) : String(Math.round((feed.durationSeconds || 0) / 60)))
  const [timestamp, setTimestamp] = useState(formatAppDateTimeLocal(feed.timestamp))
  const [pending, startTransition] = useTransition()
  const currentKind = feedKind(feed)
  const amountValue = Number(amount)
  const canSave = Number.isFinite(amountValue) && amountValue > 0 && Boolean(timestamp)

  function save() {
    if (!canSave) return
    const formData = new FormData()
    formData.set('id', feed.id)
    formData.set('type', kind === 'formula' ? 'formula' : 'breast')
    formData.set('measure', kind === 'breast' ? 'duration' : 'volume')
    formData.set('amount', String(Math.round(amountValue)))
    formData.set('timestamp', timestamp)
    startTransition(async () => {
      await updateFeedAction(formData)
      setEditing(false)
      onChanged()
    })
  }

  if (editing) {
    return (
      <div className="grid grid-cols-[82px_1fr_130px_112px] items-center gap-3 border-b border-muted/40 py-2 text-sm last:border-0">
        <input type="datetime-local" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} disabled={pending} className="col-span-2 h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground" />
        <div className="grid grid-cols-3 gap-1">
          {(['breast', 'expressed', 'formula'] as FeedKind[]).map(option => (
            <button key={option} type="button" onClick={() => setKind(option)} disabled={pending} className={`h-9 rounded-md text-xs font-medium ${kind === option ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
              {option === 'expressed' ? 'Milk' : option}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-1">
          <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={pending} className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-xs text-foreground" />
          <button type="button" onClick={() => setEditing(false)} disabled={pending} className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground" aria-label="Cancel edit">
            <X className="h-4 w-4" />
          </button>
          <button type="button" onClick={save} disabled={!canSave || pending} className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500 text-white disabled:opacity-45" aria-label="Save feed">
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[82px_1fr_130px_112px] items-center gap-3 border-b border-muted/40 py-2 text-sm last:border-0">
      <span className="text-xs tabular-nums text-muted-foreground">{formatAppTime(feed.timestamp)}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{feedLabel(currentKind)}</span>
      <span className={`text-right font-semibold tabular-nums ${tone(currentKind)}`}>{feedAmount(feed)}</span>
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => setEditing(true)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit feed">
          <Pencil className="h-4 w-4" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400" aria-label="Delete feed">
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this feed?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently remove the {feedLabel(currentKind).toLowerCase()} logged at {formatAppTime(feed.timestamp)}.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <form action={deleteFeedAction}>
                <input type="hidden" name="id" value={feed.id} />
                <AlertDialogAction type="submit" className="bg-red-500 text-white hover:bg-red-400">Delete</AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function NappyActivityRow({ nappy, onChanged }: { nappy: NappyEntry; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState(nappy.type)
  const [timestamp, setTimestamp] = useState(formatAppDateTimeLocal(nappy.timestamp))
  const [pending, startTransition] = useTransition()

  function save() {
    const formData = new FormData()
    formData.set('id', nappy.id)
    formData.set('type', type)
    formData.set('timestamp', timestamp)
    startTransition(async () => {
      await updateNappyAction(formData)
      setEditing(false)
      onChanged()
    })
  }

  if (editing) {
    return (
      <div className="grid grid-cols-[82px_1fr_130px_112px] items-center gap-3 border-b border-muted/40 py-2 text-sm last:border-0">
        <input type="datetime-local" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} disabled={pending} className="col-span-2 h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground" />
        <div className="grid grid-cols-3 gap-1">
          {(['wet', 'dirty', 'both'] as const).map(option => (
            <button key={option} type="button" onClick={() => setType(option)} disabled={pending} className={`h-9 rounded-md text-xs font-medium ${type === option ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
              {option === 'both' ? 'both' : option}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => setEditing(false)} disabled={pending} className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground" aria-label="Cancel edit">
            <X className="h-4 w-4" />
          </button>
          <button type="button" onClick={save} disabled={!timestamp || pending} className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500 text-white disabled:opacity-45" aria-label="Save nappy">
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[82px_1fr_130px_112px] items-center gap-3 border-b border-muted/40 py-2 text-sm last:border-0">
      <span className="text-xs tabular-nums text-muted-foreground">{formatAppTime(nappy.timestamp)}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{nappyLabel(nappy)} nappy</span>
      <span className={`text-right font-semibold capitalize ${tone(nappy.type)}`}>{nappy.type}</span>
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => setEditing(true)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit nappy">
          <Pencil className="h-4 w-4" />
        </button>
        <form action={deleteNappyAction}>
          <input type="hidden" name="id" value={nappy.id} />
          <button type="submit" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400" aria-label="Delete nappy">
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

function PumpActivityRow({ pump, onChanged }: { pump: PumpEntry; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(String(Math.round((pump.durationSeconds || 0) / 60)))
  const [volumeMl, setVolumeMl] = useState(pump.volumeMl ? String(pump.volumeMl) : '')
  const [timestamp, setTimestamp] = useState(formatAppDateTimeLocal(pump.timestamp))
  const [pending, startTransition] = useTransition()
  const durationValue = Number(durationMinutes)
  const volumeValue = Number(volumeMl)
  const hasVolume = volumeMl.trim() !== ''
  const canSave = Number.isFinite(durationValue) && durationValue > 0 && (!hasVolume || (Number.isFinite(volumeValue) && volumeValue > 0)) && Boolean(timestamp)

  function save() {
    if (!canSave) return
    const formData = new FormData()
    formData.set('id', pump.id)
    formData.set('durationMinutes', String(Math.round(durationValue)))
    formData.set('volumeMl', hasVolume ? String(Math.round(volumeValue)) : '')
    formData.set('timestamp', timestamp)
    startTransition(async () => {
      await updatePumpAction(formData)
      setEditing(false)
      onChanged()
    })
  }

  if (editing) {
    return (
      <div className="grid grid-cols-[82px_1fr_130px_112px] items-center gap-3 border-b border-muted/40 py-2 text-sm last:border-0">
        <input type="datetime-local" value={timestamp} onChange={(event) => setTimestamp(event.target.value)} disabled={pending} className="col-span-2 h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground" />
        <div className="grid grid-cols-2 gap-1">
          <input type="number" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} disabled={pending} className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground" />
          <input type="number" value={volumeMl} onChange={(event) => setVolumeMl(event.target.value)} disabled={pending} className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground" placeholder="n/a" />
        </div>
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => setEditing(false)} disabled={pending} className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground" aria-label="Cancel edit">
            <X className="h-4 w-4" />
          </button>
          <button type="button" onClick={save} disabled={!canSave || pending} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 text-white disabled:opacity-45" aria-label="Save pump">
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[82px_1fr_130px_112px] items-center gap-3 border-b border-muted/40 py-2 text-sm last:border-0">
      <span className="text-xs tabular-nums text-muted-foreground">{formatAppTime(pump.timestamp)}</span>
      <span className="min-w-0 truncate font-medium text-foreground">Pump session</span>
      <span className="text-right font-semibold tabular-nums text-emerald-400">{pumpDetail(pump)}</span>
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => setEditing(true)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit pump">
          <Pencil className="h-4 w-4" />
        </button>
        <form action={deletePumpAction}>
          <input type="hidden" name="id" value={pump.id} />
          <button type="submit" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400" aria-label="Delete pump">
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

function RecentActivity({ items, onChanged }: { items: HistoryItem[]; onChanged: () => void }) {
  return (
    <section className="rounded-xl border border-muted bg-muted/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
          <p className="text-sm text-muted-foreground">Last 24 hours</p>
        </div>
        <a href="/history?type=all&range=24h" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Details
        </a>
      </div>
      <div className="grid grid-cols-[82px_1fr_130px_112px] gap-3 border-b border-muted/60 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Time</span>
        <span>Entry</span>
        <span className="text-right">Detail</span>
        <span className="text-right">Actions</span>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No entries in the last 24 hours</div>
        ) : (
          items.map(item => item.type === 'feed'
            ? <FeedActivityRow key={item.id} feed={item.data as FeedEntry} onChanged={onChanged} />
            : item.type === 'nappy'
              ? <NappyActivityRow key={item.id} nappy={item.data as NappyEntry} onChanged={onChanged} />
              : <PumpActivityRow key={item.id} pump={item.data as PumpEntry} onChanged={onChanged} />
          )
        )}
      </div>
    </section>
  )
}

export function DesktopHomePanel({
  overview,
  history,
  analytics,
  feedingIntervalMinutes,
}: {
  overview: {
    lastFeed: FeedEntry | null
    lastNappy: NappyEntry | null
    lastPump: PumpEntry | null
    summary: DailySummary
  }
  history: {
    items: HistoryItem[]
  }
  analytics: {
    data: AnalyticsDataPoint[]
  }
  feedingIntervalMinutes?: number
}) {
  const router = useRouter()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [now] = useState(() => new Date())
  const [isPending, startTransition] = useTransition()
  const isLogging = isPending || pendingKey !== null
  const nextFeed = nextFeedEstimate(overview.lastFeed, feedingIntervalMinutes, now)

  const todaySummary = useMemo(() => overview.summary, [overview.summary])

  function refresh() {
    router.refresh()
  }

  function logFeed(kind: FeedKind, amount: number, timestamp: string) {
    const rounded = Math.round(amount)
    const formData = new FormData()
    formData.set('type', kind === 'formula' ? 'formula' : 'breast')
    formData.set('measure', kind === 'breast' ? 'duration' : 'volume')
    formData.set('amount', String(rounded))
    formData.set('timestamp', timestamp)
    setPendingKey(`${kind}-${rounded}`)
    startTransition(async () => {
      try {
        await addFeedAction(formData)
        setMessage(`${feedLabel(kind)} logged`)
        refresh()
      } finally {
        setPendingKey(null)
      }
    })
  }

  function logNappy(type: NappyEntry['type'], timestamp: string) {
    const formData = new FormData()
    formData.set('type', type)
    formData.set('timestamp', timestamp)
    setPendingKey(`nappy-${type}`)
    startTransition(async () => {
      try {
        await addNappyAction(formData)
        setMessage(`${nappyLabel({ type, id: '', timestamp: new Date() })} nappy logged`)
        refresh()
      } finally {
        setPendingKey(null)
      }
    })
  }

  function logPump(durationMinutes: number, volumeMl: number | undefined, timestamp: string) {
    const roundedDuration = Math.round(durationMinutes)
    const roundedVolume = typeof volumeMl === 'number' ? Math.round(volumeMl) : undefined
    const formData = new FormData()
    formData.set('durationMinutes', String(roundedDuration))
    formData.set('volumeMl', roundedVolume ? String(roundedVolume) : '')
    formData.set('timestamp', timestamp)
    setPendingKey(`pump-${roundedDuration}-${roundedVolume ?? 'na'}`)
    startTransition(async () => {
      try {
        await addPumpAction(formData)
        setMessage(`Pump session logged: ${roundedDuration}m · ${roundedVolume ? `${roundedVolume}ml` : 'n/a'}`)
        refresh()
      } finally {
        setPendingKey(null)
      }
    })
  }

  return (
    <div className="hidden min-h-[calc(100vh-11rem)] gap-4 lg:grid">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <StatTile label="Since feed" value={formatTimeSince(overview.lastFeed?.timestamp ?? null, now)} helper={nextFeed || undefined} />
        <StatTile label="Since nappy" value={formatTimeSince(overview.lastNappy?.timestamp ?? null, now)} helper={overview.lastNappy ? `${nappyLabel(overview.lastNappy)} nappy` : undefined} />
        <StatTile label="Since pump" value={formatTimeSince(overview.lastPump?.timestamp ?? null, now)} helper={overview.lastPump ? pumpDetail(overview.lastPump) : undefined} />
        <StatTile label="Today feeds" value={String(todaySummary.feedSessionCount)} helper={`${todaySummary.feedCount} feed entries`} />
        <StatTile label="Today nappies" value={String(todaySummary.nappyCount)} helper={`${todaySummary.wetCount} wet, ${todaySummary.dirtyCount} dirty`} />
        <StatTile label="Today pump" value={`${todaySummary.totalPumpMl}ml`} helper={`${todaySummary.pumpCount} sessions, ${todaySummary.totalPumpMinutes}m`} />
      </section>

      {message && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className="text-emerald-300/80 hover:text-emerald-200" aria-label="Dismiss message">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DesktopQuickLog pending={isLogging} onLogFeed={logFeed} onLogNappy={logNappy} onLogPump={logPump} />
        <CompactAnalytics data={analytics.data} />
      </div>

      <RecentActivity items={history.items} onChanged={refresh} />
    </div>
  )
}
