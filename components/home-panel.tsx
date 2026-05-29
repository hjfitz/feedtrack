'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addFeedAction, addNappyAction, addPumpAction } from '@/app/actions/tracker'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { formatAppDateTimeLocal, formatAppTime } from '@/lib/timezone'
import type { DailySummary, FeedEntry, NappyEntry, PumpEntry } from '@/lib/types'

function formatTimeSince(date: Date | null, now: Date): string {
  if (!date) return '--'
  const diffMins = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000))
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}h ${mins}m`
}

function formatDurationMins(seconds: number): string {
  return `${Math.floor(seconds / 60)}m`
}

function formatSummaryMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function feedDueInfo(lastFeed: FeedEntry | null, feedingIntervalMinutes: number | undefined, now: Date) {
  if (!lastFeed || !feedingIntervalMinutes) return null

  const lastFeedTime = new Date(lastFeed.timestamp).getTime()
  if (!Number.isFinite(lastFeedTime)) return null

  const dueAt = new Date(lastFeedTime + feedingIntervalMinutes * 60000)
  const minutesUntil = Math.ceil((dueAt.getTime() - now.getTime()) / 60000)
  const absMinutes = Math.abs(minutesUntil)

  if (minutesUntil < 0) {
    return {
      status: 'overdue' as const,
      countdown: `${formatSummaryMinutes(absMinutes)} late`,
      dueLabel: `Due ${formatAppTime(dueAt)}`,
    }
  }

  if (minutesUntil === 0) {
    return {
      status: 'due' as const,
      countdown: 'Due now',
      dueLabel: `Due ${formatAppTime(dueAt)}`,
    }
  }

  return {
    status: minutesUntil <= 30 ? 'soon' as const : 'later' as const,
    countdown: formatSummaryMinutes(minutesUntil),
    dueLabel: `Due ${formatAppTime(dueAt)}`,
  }
}

const BREAST_PRESETS = [5, 10, 15, 20, 25, 30]
const FORMULA_PRESETS = [30, 60, 90, 120, 150, 180]
const EXPRESSED_PRESETS = [30, 60, 90, 120, 150, 180]
const PUMP_DURATION_PRESETS = [10, 15, 20, 25, 30, 40]
const PUMP_VOLUME_PRESETS = [30, 60, 90, 120, 150, 180]

type QuickLogMode = 'home' | 'breast' | 'expressed' | 'formula' | 'pump'
type ConfirmationType = 'breast' | 'expressed' | 'formula' | 'pump' | 'wet' | 'dirty' | 'both' | null

interface DayNavigation {
  label: string
  selectedKey: string
  isToday: boolean
  previousHref: string
  nextHref: string | null
  todayKey: string
}

function formatFeedDetail(feed: FeedEntry) {
  if (feed.type === 'formula') return `Formula ${feed.volumeMl || 0}ml`
  if (feed.volumeMl) return `Breast milk ${feed.volumeMl}ml`
  return `Breast ${feed.durationSeconds ? formatDurationMins(feed.durationSeconds) : ''}`
}

function formatPumpVolume(volumeMl?: number) {
  return volumeMl ? `${volumeMl}ml` : 'n/a'
}

function formatPumpDetail(pump: PumpEntry) {
  return `${Math.round((pump.durationSeconds || 0) / 60)}m · ${formatPumpVolume(pump.volumeMl)}`
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function keyFromDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function hrefForDateKey(key: string, todayKey: string) {
  return key === todayKey ? '/' : `/?date=${key}`
}

export function HomePanel({
  lastFeed,
  lastNappy,
  lastPump,
  dayLastFeed,
  dayLastNappy,
  dayLastPump,
  summary,
  feedingIntervalMinutes,
  dayNavigation,
}: {
  lastFeed: FeedEntry | null
  lastNappy: NappyEntry | null
  lastPump: PumpEntry | null
  dayLastFeed: FeedEntry | null
  dayLastNappy: NappyEntry | null
  dayLastPump: PumpEntry | null
  summary: DailySummary
  feedingIntervalMinutes?: number
  dayNavigation: DayNavigation
}) {
  const router = useRouter()
  const [mode, setMode] = useState<QuickLogMode>('home')
  const [confirmation, setConfirmation] = useState<ConfirmationType>(null)
  const [confirmationDetail, setConfirmationDetail] = useState('')
  const [customBreastMinutes, setCustomBreastMinutes] = useState('')
  const [customExpressedMl, setCustomExpressedMl] = useState('')
  const [customFormulaMl, setCustomFormulaMl] = useState('')
  const [pumpMinutes, setPumpMinutes] = useState('20')
  const [pumpMl, setPumpMl] = useState('90')
  const [feedTimestamp, setFeedTimestamp] = useState(() => formatAppDateTimeLocal(new Date()))
  const [pumpTimestamp, setPumpTimestamp] = useState(() => formatAppDateTimeLocal(new Date()))
  const [nappyOpen, setNappyOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [nappyType, setNappyType] = useState<'wet' | 'dirty' | 'both'>('wet')
  const [nappyTimestamp, setNappyTimestamp] = useState(() => formatAppDateTimeLocal(new Date()))
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [isPending, startTransition] = useTransition()
  const [isNavigating, startNavigation] = useTransition()

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!confirmation) return
    const timeout = setTimeout(() => {
      setConfirmation(null)
      setConfirmationDetail('')
    }, 1500)
    return () => clearTimeout(timeout)
  }, [confirmation])

  const isLogging = isPending || pendingKey !== null
  const selectedDate = useMemo(() => dateFromKey(dayNavigation.selectedKey), [dayNavigation.selectedKey])
  const todayDate = useMemo(() => dateFromKey(dayNavigation.todayKey), [dayNavigation.todayKey])
  const customBreastValue = Number(customBreastMinutes)
  const customExpressedValue = Number(customExpressedMl)
  const customFormulaValue = Number(customFormulaMl)
  const pumpMinutesValue = Number(pumpMinutes)
  const pumpMlValue = Number(pumpMl)
  const canLogCustomBreast = Number.isFinite(customBreastValue) && customBreastValue > 0
  const canLogCustomExpressed = Number.isFinite(customExpressedValue) && customExpressedValue > 0
  const canLogCustomFormula = Number.isFinite(customFormulaValue) && customFormulaValue > 0
  const hasPumpVolume = pumpMl.trim() !== ''
  const canLogPump = Number.isFinite(pumpMinutesValue) && pumpMinutesValue > 0 && (!hasPumpVolume || (Number.isFinite(pumpMlValue) && pumpMlValue > 0)) && Boolean(pumpTimestamp)
  const canLogNappy = Boolean(nappyType && nappyTimestamp)
  const nextFeed = feedDueInfo(lastFeed, feedingIntervalMinutes, now)
  const feedCardClass = nextFeed?.status === 'overdue'
    ? 'border-red-500/45 bg-red-500/15 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]'
    : nextFeed?.status === 'due'
      ? 'border-orange-500/45 bg-orange-500/15 shadow-[0_0_0_1px_rgba(249,115,22,0.14)]'
      : nextFeed?.status === 'soon'
        ? 'border-amber-500/40 bg-amber-500/10'
        : 'border-sky-500/20 bg-sky-500/10'
  const feedLabelClass = nextFeed?.status === 'overdue'
    ? 'text-red-300'
    : nextFeed?.status === 'due'
      ? 'text-orange-300'
      : nextFeed?.status === 'soon'
        ? 'text-amber-300'
        : 'text-sky-300'

  function navigateTo(href: string) {
    if (isNavigating) return
    startNavigation(() => {
      router.push(href)
    })
  }

  function pickDate(date: Date | undefined) {
    if (!date) return
    const key = keyFromDate(date)
    setDatePickerOpen(false)
    navigateTo(hrefForDateKey(key, dayNavigation.todayKey))
  }

  const ConfirmationToast = () => {
    if (!confirmation) return null

    const configs = {
      breast: { label: 'Breast feed logged', color: 'bg-sky-500' },
      expressed: { label: 'Breast milk logged', color: 'bg-cyan-500' },
      formula: { label: 'Formula logged', color: 'bg-amber-500' },
      pump: { label: 'Pump session logged', color: 'bg-emerald-500' },
      wet: { label: 'Wet nappy logged', color: 'bg-blue-500' },
      dirty: { label: 'Dirty nappy logged', color: 'bg-orange-500' },
      both: { label: 'Nappy logged', color: 'bg-violet-500' },
    }
    const config = configs[confirmation]

    return (
      <div className="fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className={`${config.color} rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg`}>
          <span className="text-white text-xl">✓</span>
          <span className="text-white font-semibold text-lg flex-1">{config.label}</span>
          {confirmationDetail && <span className="text-white/80 font-medium">{confirmationDetail}</span>}
        </div>
      </div>
    )
  }

  function runLog(key: string, formData: FormData, action: (formData: FormData) => Promise<void>, done: () => void) {
    if (isLogging) return
    setPendingKey(key)
    startTransition(async () => {
      try {
        await action(formData)
        done()
      } finally {
        setPendingKey(null)
      }
    })
  }

  function showFeedMode(nextMode: Exclude<QuickLogMode, 'home'>) {
    setFeedTimestamp(formatAppDateTimeLocal(new Date()))
    setPumpTimestamp(formatAppDateTimeLocal(new Date()))
    setMode(nextMode)
  }

  function openNappyDialog(type: 'wet' | 'dirty' | 'both' = 'wet') {
    setNappyType(type)
    setNappyTimestamp(formatAppDateTimeLocal(new Date()))
    setNappyOpen(true)
  }

  function logFeed(type: 'breast' | 'formula', amount: number, measure: 'duration' | 'volume') {
    if (!feedTimestamp) return
    const rounded = Math.round(amount)
    const formData = new FormData()
    formData.set('type', type)
    formData.set('measure', measure)
    formData.set('amount', String(rounded))
    formData.set('timestamp', feedTimestamp)
    runLog(`${type}-${measure}-${rounded}`, formData, addFeedAction, () => {
      const confirmationType = type === 'breast' && measure === 'volume' ? 'expressed' : type
      setConfirmation(confirmationType)
      setConfirmationDetail(measure === 'duration' ? `${rounded}m` : `${rounded}ml`)
      setCustomBreastMinutes('')
      setCustomExpressedMl('')
      setCustomFormulaMl('')
      setFeedTimestamp(formatAppDateTimeLocal(new Date()))
      setMode('home')
    })
  }

  function logNappy() {
    if (!canLogNappy) return
    const formData = new FormData()
    formData.set('type', nappyType)
    formData.set('timestamp', nappyTimestamp)
    runLog(`nappy-${nappyType}`, formData, addNappyAction, () => {
      setConfirmation(nappyType)
      setNappyOpen(false)
      setNappyTimestamp(formatAppDateTimeLocal(new Date()))
    })
  }

  function logPump() {
    if (!canLogPump) return
    const roundedMinutes = Math.round(pumpMinutesValue)
    const roundedMl = hasPumpVolume ? Math.round(pumpMlValue) : undefined
    const formData = new FormData()
    formData.set('durationMinutes', String(roundedMinutes))
    formData.set('volumeMl', roundedMl ? String(roundedMl) : '')
    formData.set('timestamp', pumpTimestamp)
    runLog(`pump-${roundedMinutes}-${roundedMl ?? 'na'}`, formData, addPumpAction, () => {
      setConfirmation('pump')
      setConfirmationDetail(`${roundedMinutes}m · ${formatPumpVolume(roundedMl)}`)
      setPumpTimestamp(formatAppDateTimeLocal(new Date()))
      setMode('home')
    })
  }

  const mainContent = useMemo(() => {
    if (mode === 'breast') {
      return (
        <div className="flex flex-col gap-6 px-1">
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">Breast feed</p>
            <p className="text-muted-foreground text-sm mt-1">Select duration</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="breast-feed-time" className="text-sm text-muted-foreground">Date & time</label>
            <input id="breast-feed-time" type="datetime-local" value={feedTimestamp} onChange={(event) => setFeedTimestamp(event.target.value)} disabled={isLogging} className="h-12 rounded-xl bg-background border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 disabled:opacity-45 disabled:cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {BREAST_PRESETS.map(mins => (
              <button key={mins} onClick={() => logFeed('breast', mins, 'duration')} disabled={!feedTimestamp || isLogging} className="py-7 rounded-2xl bg-sky-500/15 border-2 border-sky-500/30 text-sky-400 text-2xl font-bold transition-all duration-150 hover:bg-sky-500/25 hover:border-sky-500/50 hover:scale-[1.02] active:bg-sky-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                {mins}m
              </button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); if (canLogCustomBreast) logFeed('breast', customBreastValue, 'duration') }} className="flex flex-col gap-3 rounded-2xl bg-muted/30 border border-muted/50 p-4">
            <label htmlFor="custom-breast-minutes" className="text-sm text-muted-foreground">Custom time</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input id="custom-breast-minutes" type="number" inputMode="numeric" min="1" step="1" value={customBreastMinutes} onChange={(event) => setCustomBreastMinutes(event.target.value)} disabled={isLogging} className="h-14 w-full rounded-xl bg-background border border-border px-4 pr-14 text-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 disabled:opacity-45 disabled:cursor-not-allowed" placeholder="12" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">min</span>
              </div>
              <button type="submit" disabled={!canLogCustomBreast || !feedTimestamp || isLogging} className="h-14 px-5 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Log
              </button>
            </div>
          </form>
          <button onClick={() => setMode('home')} className="text-muted-foreground py-4 text-base font-medium hover:text-foreground transition-colors">Cancel</button>
        </div>
      )
    }

    if (mode === 'expressed') {
      return (
        <div className="flex flex-col gap-6 px-1">
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">Breast milk</p>
            <p className="text-muted-foreground text-sm mt-1">Select amount</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="expressed-feed-time" className="text-sm text-muted-foreground">Date & time</label>
            <input id="expressed-feed-time" type="datetime-local" value={feedTimestamp} onChange={(event) => setFeedTimestamp(event.target.value)} disabled={isLogging} className="h-12 rounded-xl bg-background border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 disabled:opacity-45 disabled:cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {EXPRESSED_PRESETS.map(ml => (
              <button key={ml} onClick={() => logFeed('breast', ml, 'volume')} disabled={!feedTimestamp || isLogging} className="py-7 rounded-2xl bg-cyan-500/15 border-2 border-cyan-500/30 text-cyan-400 text-2xl font-bold transition-all duration-150 hover:bg-cyan-500/25 hover:border-cyan-500/50 hover:scale-[1.02] active:bg-cyan-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                {ml}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); if (canLogCustomExpressed) logFeed('breast', customExpressedValue, 'volume') }} className="flex flex-col gap-3 rounded-2xl bg-muted/30 border border-muted/50 p-4">
            <label htmlFor="custom-expressed-ml" className="text-sm text-muted-foreground">Custom amount</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input id="custom-expressed-ml" type="number" inputMode="numeric" min="1" step="1" value={customExpressedMl} onChange={(event) => setCustomExpressedMl(event.target.value)} disabled={isLogging} className="h-14 w-full rounded-xl bg-background border border-border px-4 pr-12 text-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 disabled:opacity-45 disabled:cursor-not-allowed" placeholder="75" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">ml</span>
              </div>
              <button type="submit" disabled={!canLogCustomExpressed || !feedTimestamp || isLogging} className="h-14 px-5 rounded-xl bg-cyan-500 text-white font-semibold hover:bg-cyan-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Log
              </button>
            </div>
          </form>
          <button onClick={() => setMode('home')} className="text-muted-foreground py-4 text-base font-medium hover:text-foreground transition-colors">Cancel</button>
        </div>
      )
    }

    if (mode === 'formula') {
      return (
        <div className="flex flex-col gap-6 px-1">
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">Formula</p>
            <p className="text-muted-foreground text-sm mt-1">Select amount</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="formula-feed-time" className="text-sm text-muted-foreground">Date & time</label>
            <input id="formula-feed-time" type="datetime-local" value={feedTimestamp} onChange={(event) => setFeedTimestamp(event.target.value)} disabled={isLogging} className="h-12 rounded-xl bg-background border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 disabled:opacity-45 disabled:cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {FORMULA_PRESETS.map(ml => (
              <button key={ml} onClick={() => logFeed('formula', ml, 'volume')} disabled={!feedTimestamp || isLogging} className="py-7 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-400 text-2xl font-bold transition-all duration-150 hover:bg-amber-500/25 hover:border-amber-500/50 hover:scale-[1.02] active:bg-amber-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                {ml}
              </button>
            ))}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); if (canLogCustomFormula) logFeed('formula', customFormulaValue, 'volume') }} className="flex flex-col gap-3 rounded-2xl bg-muted/30 border border-muted/50 p-4">
            <label htmlFor="custom-formula-ml" className="text-sm text-muted-foreground">Custom amount</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input id="custom-formula-ml" type="number" inputMode="numeric" min="1" step="1" value={customFormulaMl} onChange={(event) => setCustomFormulaMl(event.target.value)} disabled={isLogging} className="h-14 w-full rounded-xl bg-background border border-border px-4 pr-12 text-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 disabled:opacity-45 disabled:cursor-not-allowed" placeholder="75" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">ml</span>
              </div>
              <button type="submit" disabled={!canLogCustomFormula || !feedTimestamp || isLogging} className="h-14 px-5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Log
              </button>
            </div>
          </form>
          <button onClick={() => setMode('home')} className="text-muted-foreground py-4 text-base font-medium hover:text-foreground transition-colors">Cancel</button>
        </div>
      )
    }

    if (mode === 'pump') {
      return (
        <div className="flex flex-col gap-6 px-1">
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">Pump session</p>
            <p className="text-muted-foreground text-sm mt-1">Record total time and milk</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="pump-time" className="text-sm text-muted-foreground">Date & time</label>
            <input id="pump-time" type="datetime-local" value={pumpTimestamp} onChange={(event) => setPumpTimestamp(event.target.value)} disabled={isLogging} className="h-12 rounded-xl bg-background border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:opacity-45 disabled:cursor-not-allowed" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Duration</p>
              <div className="grid grid-cols-2 gap-2">
                {PUMP_DURATION_PRESETS.map(mins => (
                  <button key={mins} type="button" onClick={() => setPumpMinutes(String(mins))} disabled={isLogging} className={`h-12 rounded-xl border text-sm font-bold transition-colors ${pumpMinutes === String(mins) ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'} disabled:opacity-45`}>
                    {mins}m
                  </button>
                ))}
              </div>
              <div className="relative">
                <input type="number" inputMode="numeric" min="1" step="1" value={pumpMinutes} onChange={(event) => setPumpMinutes(event.target.value)} disabled={isLogging} className="h-12 w-full rounded-xl bg-background border border-border px-4 pr-14 text-foreground disabled:opacity-45" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">min</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Volume</p>
              <div className="grid grid-cols-2 gap-2">
                {PUMP_VOLUME_PRESETS.map(ml => (
                  <button key={ml} type="button" onClick={() => setPumpMl(String(ml))} disabled={isLogging} className={`h-12 rounded-xl border text-sm font-bold transition-colors ${pumpMl === String(ml) ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'} disabled:opacity-45`}>
                    {ml}
                  </button>
                ))}
                <button type="button" onClick={() => setPumpMl('')} disabled={isLogging} className={`h-12 rounded-xl border text-sm font-bold transition-colors ${pumpMl === '' ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'} disabled:opacity-45`}>
                  n/a
                </button>
              </div>
              <div className="relative">
                <input type="number" inputMode="numeric" min="1" step="1" value={pumpMl} onChange={(event) => setPumpMl(event.target.value)} disabled={isLogging} className="h-12 w-full rounded-xl bg-background border border-border px-4 pr-12 text-foreground disabled:opacity-45" placeholder="n/a" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">ml</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={logPump} disabled={!canLogPump || isLogging} className="h-14 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            Log pump
          </button>
          <button onClick={() => setMode('home')} className="text-muted-foreground py-4 text-base font-medium hover:text-foreground transition-colors">Cancel</button>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-6">
        <div className={`flex items-center justify-between gap-3 rounded-2xl border border-muted/60 bg-muted/20 p-2 transition-opacity ${isNavigating ? 'opacity-70' : ''}`}>
          <button type="button" onClick={() => navigateTo(dayNavigation.previousHref)} disabled={isNavigating} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-wait disabled:opacity-50" aria-label="Previous day">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setDatePickerOpen(true)} disabled={isNavigating} className="min-w-0 rounded-xl px-3 py-1 text-center transition-colors hover:bg-background disabled:cursor-wait disabled:opacity-70" aria-label="Choose day">
            <span className="block truncate text-base font-semibold text-foreground">{isNavigating ? 'Loading day' : dayNavigation.label}</span>
            <span className="mt-0.5 flex items-center justify-center gap-1 text-xs tabular-nums text-muted-foreground">
              {isNavigating && <Spinner className="h-3 w-3" />}
              {dayNavigation.selectedKey}
            </span>
          </button>
          {dayNavigation.nextHref ? (
            <button type="button" onClick={() => dayNavigation.nextHref && navigateTo(dayNavigation.nextHref)} disabled={isNavigating} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-wait disabled:opacity-50" aria-label="Next day">
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground/30" aria-hidden="true">
              <ChevronRight className="h-5 w-5" />
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className={`min-w-0 rounded-2xl p-3 text-center border transition-colors sm:p-4 ${dayNavigation.isToday ? feedCardClass : 'border-sky-500/20 bg-sky-500/10'}`}>
            <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${dayNavigation.isToday ? feedLabelClass : 'text-sky-300'}`}>Feed</p>
            <p className="whitespace-nowrap text-lg font-bold text-foreground tabular-nums sm:text-3xl">
              {dayNavigation.isToday
                ? nextFeed?.countdown ?? formatTimeSince(lastFeed?.timestamp ?? null, now)
                : dayLastFeed ? formatAppTime(dayLastFeed.timestamp) : '--'}
            </p>
            {dayNavigation.isToday && nextFeed && <p className={`mt-1 truncate text-[11px] font-semibold sm:text-sm ${feedLabelClass}`}>{nextFeed.dueLabel}</p>}
            {dayNavigation.isToday
              ? lastFeed && <p className="mt-1 truncate text-[10px] text-muted-foreground sm:text-xs">Last {formatFeedDetail(lastFeed)}</p>
              : <p className="mt-1 truncate text-[10px] text-muted-foreground sm:text-xs">{dayLastFeed ? formatFeedDetail(dayLastFeed) : 'No feed'}</p>}
          </div>
          <div className="min-w-0 rounded-2xl bg-violet-500/10 p-3 text-center border border-violet-500/20 sm:p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-300 sm:text-xs">Nappy</p>
            <p className="whitespace-nowrap text-xl font-bold text-foreground tabular-nums sm:text-3xl">
              {dayNavigation.isToday ? formatTimeSince(lastNappy?.timestamp ?? null, now) : dayLastNappy ? formatAppTime(dayLastNappy.timestamp) : '--'}
            </p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground capitalize sm:text-sm">
              {dayNavigation.isToday
                ? lastNappy ? lastNappy.type === 'both' ? 'Wet + Dirty' : lastNappy.type : 'No nappy'
                : dayLastNappy ? dayLastNappy.type === 'both' ? 'Wet + Dirty' : dayLastNappy.type : 'No nappy'}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl bg-emerald-500/10 p-3 text-center border border-emerald-500/20 sm:p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 sm:text-xs">Pump</p>
            <p className="whitespace-nowrap text-xl font-bold text-foreground tabular-nums sm:text-3xl">
              {dayNavigation.isToday ? formatTimeSince(lastPump?.timestamp ?? null, now) : dayLastPump ? formatAppTime(dayLastPump.timestamp) : '--'}
            </p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-sm">
              {dayNavigation.isToday
                ? lastPump ? formatPumpDetail(lastPump) : 'No pump'
                : dayLastPump ? formatPumpDetail(dayLastPump) : 'No pump'}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-muted/30 p-4 border border-muted/50">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{dayNavigation.isToday ? 'Today' : 'Selected day'}</p>
            <p className="text-xs font-semibold text-emerald-400 tabular-nums">
              {summary.feedSessionCount} feed {summary.feedSessionCount === 1 ? 'session' : 'sessions'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-2 py-3 min-w-0">
              <p className="text-xs text-muted-foreground">Breast</p>
              <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-sky-400 tabular-nums">
                <p>{summary.breastFeedCount} entries</p>
                <p>{formatSummaryMinutes(summary.totalBreastMinutes)}</p>
                <p>{summary.totalBreastMilkMl}ml</p>
              </div>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-2 py-3 min-w-0">
              <p className="text-xs text-muted-foreground">Formula</p>
              <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-amber-400 tabular-nums">
                <p>{summary.formulaFeedCount} entries</p>
                <p>{summary.totalFormulaMl}ml</p>
              </div>
            </div>
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-2 py-3 min-w-0">
              <p className="text-xs text-muted-foreground">Nappies</p>
              <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-violet-400 tabular-nums">
                <p>{summary.nappyCount} total</p>
                <p>{summary.wetCount} wet</p>
                <p>{summary.dirtyCount} dirty</p>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2 py-3 min-w-0">
              <p className="text-xs text-muted-foreground">Pump</p>
              <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-emerald-400 tabular-nums">
                <p>{summary.pumpCount} sessions</p>
                <p>{summary.totalPumpMinutes}m</p>
                <p>{summary.totalPumpMl}ml</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Log</p>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="rounded-2xl border border-muted/60 bg-muted/20 p-3">
            <p className="mb-2 text-xs text-muted-foreground uppercase tracking-wide">Feeds</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <button onClick={() => showFeedMode('breast')} disabled={isLogging} className="flex h-20 min-w-0 flex-col items-center justify-center rounded-xl bg-sky-500/15 border-2 border-sky-500/30 px-1 text-sky-400 transition-all duration-150 hover:bg-sky-500/25 hover:border-sky-500/50 hover:scale-[1.01] active:bg-sky-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                <span className="text-lg font-bold">Breast</span>
                <span className="text-xs font-medium text-muted-foreground">duration</span>
              </button>
              <button onClick={() => showFeedMode('expressed')} disabled={isLogging} className="flex h-20 min-w-0 flex-col items-center justify-center rounded-xl bg-cyan-500/15 border-2 border-cyan-500/30 px-1 text-cyan-400 transition-all duration-150 hover:bg-cyan-500/25 hover:border-cyan-500/50 hover:scale-[1.01] active:bg-cyan-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                <span className="text-lg font-bold">Milk</span>
                <span className="text-xs font-medium text-muted-foreground">expressed feed</span>
              </button>
              <button onClick={() => showFeedMode('formula')} disabled={isLogging} className="flex h-20 min-w-0 flex-col items-center justify-center rounded-xl bg-amber-500/15 border-2 border-amber-500/30 px-1 text-amber-400 transition-all duration-150 hover:bg-amber-500/25 hover:border-amber-500/50 hover:scale-[1.01] active:bg-amber-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                <span className="text-lg font-bold">Formula</span>
                <span className="text-xs font-medium text-muted-foreground">bottle</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="mb-2 text-xs text-emerald-300 uppercase tracking-wide">Pump</p>
              <button onClick={() => showFeedMode('pump')} disabled={isLogging} className="flex h-20 w-full flex-col items-center justify-center rounded-xl bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-400 transition-all duration-150 hover:bg-emerald-500/25 hover:border-emerald-500/50 hover:scale-[1.01] active:bg-emerald-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                <span className="text-lg font-bold">Pump</span>
                <span className="text-xs font-medium text-muted-foreground">time · volume</span>
              </button>
            </div>
            <div className="rounded-2xl border border-muted/60 bg-muted/20 p-3">
              <p className="mb-2 text-xs text-muted-foreground uppercase tracking-wide">Nappies</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button onClick={() => openNappyDialog('wet')} disabled={isLogging} className="flex h-20 items-center justify-center rounded-xl bg-blue-500/15 border-2 border-blue-500/30 text-blue-400 transition-all duration-150 hover:bg-blue-500/25 hover:border-blue-500/50 hover:scale-[1.01] active:bg-blue-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                  <span className="text-lg font-bold">Wet</span>
                </button>
                <button onClick={() => openNappyDialog('dirty')} disabled={isLogging} className="flex h-20 items-center justify-center rounded-xl bg-orange-500/15 border-2 border-orange-500/30 text-orange-400 transition-all duration-150 hover:bg-orange-500/25 hover:border-orange-500/50 hover:scale-[1.01] active:bg-orange-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                  <span className="text-lg font-bold">Dirty</span>
                </button>
                <button onClick={() => openNappyDialog('both')} disabled={isLogging} className="flex h-20 items-center justify-center rounded-xl bg-violet-500/15 border-2 border-violet-500/30 text-violet-400 transition-all duration-150 hover:bg-violet-500/25 hover:border-violet-500/50 hover:scale-[1.01] active:bg-violet-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                  <span className="text-lg font-bold">Both</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }, [canLogCustomBreast, canLogCustomExpressed, canLogCustomFormula, canLogPump, customBreastMinutes, customBreastValue, customExpressedMl, customExpressedValue, customFormulaMl, customFormulaValue, dayLastFeed, dayLastNappy, dayLastPump, dayNavigation, feedCardClass, feedLabelClass, feedTimestamp, isNavigating, isLogging, lastFeed, lastNappy, lastPump, mode, nextFeed, now, pumpMinutes, pumpMl, pumpTimestamp, summary])

  return (
    <>
      <ConfirmationToast />
      {mainContent}
      <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] p-4 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose day</DialogTitle>
            <DialogDescription>Select a day to review logged activity.</DialogDescription>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            disabled={{ after: todayDate }}
            onSelect={pickDate}
            className="mx-auto"
          />
        </DialogContent>
      </Dialog>
      <Dialog open={nappyOpen} onOpenChange={(open) => {
        if (isLogging) return
        if (open) openNappyDialog()
        else setNappyOpen(false)
      }}>
        <DialogContent>
          <form onSubmit={(event) => { event.preventDefault(); logNappy() }} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>Log nappy</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2">
              {(['wet', 'dirty', 'both'] as const).map(type => (
                <button key={type} type="button" onClick={() => setNappyType(type)} disabled={isLogging} className={`h-12 rounded-xl text-sm font-semibold capitalize transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${nappyType === type ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                  {type}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="nappy-time" className="text-sm text-muted-foreground">Date & time</label>
              <input id="nappy-time" type="datetime-local" value={nappyTimestamp} onChange={(event) => setNappyTimestamp(event.target.value)} disabled={isLogging} className="h-12 rounded-xl bg-background border border-border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 disabled:opacity-45 disabled:cursor-not-allowed" />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setNappyOpen(false)} disabled={isLogging} className="h-12 rounded-xl bg-muted px-5 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed">
                Cancel
              </button>
              <button type="submit" disabled={!canLogNappy || isLogging} className="h-12 rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white hover:bg-violet-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Log
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
