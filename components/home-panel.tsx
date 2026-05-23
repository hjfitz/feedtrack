'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { addFeedAction, addNappyAction } from '@/app/actions/tracker'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { estimateNextFeed, formatNextFeedEstimate } from '@/lib/feed-estimate'
import { formatAppDateTimeLocal } from '@/lib/timezone'
import type { DailySummary, FeedEntry, NappyEntry } from '@/lib/types'

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

const BREAST_PRESETS = [5, 10, 15, 20, 25, 30]
const FORMULA_PRESETS = [30, 60, 90, 120, 150, 180]
const EXPRESSED_PRESETS = [30, 60, 90, 120, 150, 180]

type QuickLogMode = 'home' | 'breast' | 'expressed' | 'formula'
type ConfirmationType = 'breast' | 'expressed' | 'formula' | 'wet' | 'dirty' | 'both' | null

function formatFeedDetail(feed: FeedEntry) {
  if (feed.type === 'formula') return `Formula ${feed.volumeMl || 0}ml`
  if (feed.volumeMl) return `Breast milk ${feed.volumeMl}ml`
  return `Breast ${feed.durationSeconds ? formatDurationMins(feed.durationSeconds) : ''}`
}

export function HomePanel({
  lastFeed,
  recentFeeds,
  lastNappy,
  summary,
  babyDob,
}: {
  lastFeed: FeedEntry | null
  recentFeeds: FeedEntry[]
  lastNappy: NappyEntry | null
  summary: DailySummary
  babyDob?: string
}) {
  const [mode, setMode] = useState<QuickLogMode>('home')
  const [confirmation, setConfirmation] = useState<ConfirmationType>(null)
  const [confirmationDetail, setConfirmationDetail] = useState('')
  const [customBreastMinutes, setCustomBreastMinutes] = useState('')
  const [customExpressedMl, setCustomExpressedMl] = useState('')
  const [customFormulaMl, setCustomFormulaMl] = useState('')
  const [feedTimestamp, setFeedTimestamp] = useState(() => formatAppDateTimeLocal(new Date()))
  const [nappyOpen, setNappyOpen] = useState(false)
  const [nappyType, setNappyType] = useState<'wet' | 'dirty' | 'both'>('wet')
  const [nappyTimestamp, setNappyTimestamp] = useState(() => formatAppDateTimeLocal(new Date()))
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [isPending, startTransition] = useTransition()

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
  const customBreastValue = Number(customBreastMinutes)
  const customExpressedValue = Number(customExpressedMl)
  const customFormulaValue = Number(customFormulaMl)
  const canLogCustomBreast = Number.isFinite(customBreastValue) && customBreastValue > 0
  const canLogCustomExpressed = Number.isFinite(customExpressedValue) && customExpressedValue > 0
  const canLogCustomFormula = Number.isFinite(customFormulaValue) && customFormulaValue > 0
  const canLogNappy = Boolean(nappyType && nappyTimestamp)
  const nextFeedEstimate = estimateNextFeed(recentFeeds, babyDob, now)

  const ConfirmationToast = () => {
    if (!confirmation) return null

    const configs = {
      breast: { label: 'Breast feed logged', color: 'bg-sky-500' },
      expressed: { label: 'Breast milk logged', color: 'bg-cyan-500' },
      formula: { label: 'Formula logged', color: 'bg-amber-500' },
      wet: { label: 'Wet nappy logged', color: 'bg-blue-500' },
      dirty: { label: 'Dirty nappy logged', color: 'bg-orange-500' },
      both: { label: 'Nappy logged', color: 'bg-violet-500' },
    }
    const config = configs[confirmation]

    return (
      <div className="fixed inset-x-4 top-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted/50 p-4 text-center border border-muted">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Since feed</p>
            <p className="whitespace-nowrap text-2xl font-bold text-foreground tabular-nums sm:text-3xl">{formatTimeSince(lastFeed?.timestamp ?? null, now)}</p>
            {lastFeed && <p className="text-sm text-muted-foreground mt-1">{formatFeedDetail(lastFeed)}</p>}
            {nextFeedEstimate && <p className="text-xs text-muted-foreground/80 mt-2">{formatNextFeedEstimate(nextFeedEstimate)}</p>}
          </div>
          <div className="rounded-2xl bg-muted/50 p-4 text-center border border-muted">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Since nappy</p>
            <p className="whitespace-nowrap text-2xl font-bold text-foreground tabular-nums sm:text-3xl">{formatTimeSince(lastNappy?.timestamp ?? null, now)}</p>
            {lastNappy && <p className="text-sm text-muted-foreground mt-1 capitalize">{lastNappy.type === 'both' ? 'Wet + Dirty' : lastNappy.type}</p>}
          </div>
        </div>
        <div className="rounded-2xl bg-muted/30 p-4 border border-muted/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Today</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-2 py-3 min-w-0">
              <p className="text-xs text-muted-foreground">Breast</p>
              <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-sky-400 tabular-nums">
                <p>{summary.breastFeedCount} feeds</p>
                <p>{formatSummaryMinutes(summary.totalBreastMinutes)}</p>
                <p>{summary.totalBreastMilkMl}ml</p>
              </div>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-2 py-3 min-w-0">
              <p className="text-xs text-muted-foreground">Formula</p>
              <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-amber-400 tabular-nums">
                <p>{summary.formulaFeedCount} feeds</p>
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
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Log</p>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Feeds</p>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => showFeedMode('breast')} disabled={isLogging} className="flex h-20 flex-col items-center justify-center rounded-2xl bg-sky-500/15 border-2 border-sky-500/30 text-sky-400 transition-all duration-150 hover:bg-sky-500/25 hover:border-sky-500/50 hover:scale-[1.01] active:bg-sky-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                <span className="text-lg font-bold">Breast</span>
                <span className="text-xs font-medium text-muted-foreground">duration</span>
              </button>
              <button onClick={() => showFeedMode('expressed')} disabled={isLogging} className="flex h-20 flex-col items-center justify-center rounded-2xl bg-cyan-500/15 border-2 border-cyan-500/30 text-cyan-400 transition-all duration-150 hover:bg-cyan-500/25 hover:border-cyan-500/50 hover:scale-[1.01] active:bg-cyan-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                <span className="text-lg font-bold">Pumped</span>
                <span className="text-xs font-medium text-muted-foreground">expressed · ml</span>
              </button>
              <button onClick={() => showFeedMode('formula')} disabled={isLogging} className="flex h-20 flex-col items-center justify-center rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-400 transition-all duration-150 hover:bg-amber-500/25 hover:border-amber-500/50 hover:scale-[1.01] active:bg-amber-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                <span className="text-lg font-bold">Formula</span>
                <span className="text-xs font-medium text-muted-foreground">made up · ml</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Nappies</p>
            <div className="grid grid-cols-3 gap-3">
              {(['wet', 'dirty', 'both'] as const).map(type => (
                <button key={type} onClick={() => openNappyDialog(type)} disabled={isLogging} className="flex h-20 items-center justify-center rounded-2xl bg-violet-500/15 border-2 border-violet-500/30 text-violet-400 transition-all duration-150 hover:bg-violet-500/25 hover:border-violet-500/50 hover:scale-[1.01] active:bg-violet-500/35 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:scale-100">
                  <span className="text-lg font-bold capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }, [babyDob, canLogCustomBreast, canLogCustomExpressed, canLogCustomFormula, customBreastMinutes, customBreastValue, customExpressedMl, customExpressedValue, customFormulaMl, customFormulaValue, feedTimestamp, isLogging, lastFeed, lastNappy, mode, nextFeedEstimate, now, recentFeeds, summary])

  return (
    <>
      <ConfirmationToast />
      {mainContent}
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
